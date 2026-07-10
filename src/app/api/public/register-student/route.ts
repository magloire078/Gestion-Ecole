import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

function resolveBaseUrl(req: Request): string {
    const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (env) return env.replace(/\/$/, '');
    const host = req.headers.get('host');
    if (host) {
        const proto = host.startsWith('localhost') ? 'http' : 'https';
        return `${proto}://${host}`;
    }
    return 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
    let createdStudentPath = '';
    const db = getAdminDb();
    let schoolId = '';
    let studentId = '';

    try {
        const body = await req.json();
        const {
            schoolId: reqSchoolId,
            lastName,
            firstName,
            gender,
            dateOfBirth,
            classId,
            parent1LastName,
            parent1FirstName,
            parent1Contact,
            paymentProvider
        } = body;

        schoolId = reqSchoolId;

        // Validations primaires
        if (!schoolId || !lastName || !firstName || !gender || !classId || !parent1LastName || !parent1FirstName || !parent1Contact || !paymentProvider) {
            return NextResponse.json({ error: "Tous les champs requis doivent être remplis." }, { status: 400 });
        }

        // Vérifier que l'école existe et est active
        const schoolRef = db.collection('ecoles').doc(schoolId);
        const schoolDoc = await schoolRef.get();
        if (!schoolDoc.exists) {
            return NextResponse.json({ error: "Établissement non trouvé." }, { status: 404 });
        }
        const schoolData = schoolDoc.data();
        if (schoolData?.status === 'deleted') {
            return NextResponse.json({ error: "Cet établissement n'est plus actif." }, { status: 403 });
        }

        // Vérifier que la classe existe
        const classRef = db.collection(`ecoles/${schoolId}/classes`).doc(classId);
        const classDoc = await classRef.get();
        if (!classDoc.exists) {
            return NextResponse.json({ error: "La classe spécifiée est introuvable." }, { status: 404 });
        }
        const classData = classDoc.data();
        const className = classData?.name || 'Classe';
        const cycleId = classData?.cycleId || 'N/A';
        const niveauId = classData?.niveauId || '';

        // Récupérer le nom du niveau/grade
        let gradeName = 'N/A';
        if (niveauId) {
            const niveauDoc = await db.collection(`ecoles/${schoolId}/niveaux`).doc(niveauId).get();
            if (niveauDoc.exists) {
                gradeName = niveauDoc.data()?.name || 'N/A';
            }
        }

        // Récupérer les frais de scolarité associés au grade/niveau de la classe
        let tuitionFee = 0;
        const feesSnapshot = await db.collection(`ecoles/${schoolId}/frais_scolarite`).where('grade', '==', gradeName).limit(1).get();
        if (!feesSnapshot.empty) {
            const feeDoc = feesSnapshot.docs[0];
            const rawAmount = feeDoc.data()?.amount;
            tuitionFee = parseFloat(String(rawAmount)) || 0;
        }

        const currentAcademicYear = schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        const inscriptionYear = parseInt(currentAcademicYear.split('-')[0]) || new Date().getFullYear();

        // 1. Générer le document Élève
        const studentCollectionRef = db.collection(`ecoles/${schoolId}/eleves`);
        const newStudentDoc = studentCollectionRef.doc();
        studentId = newStudentDoc.id;
        createdStudentPath = newStudentDoc.path;

        const studentData = {
            id: studentId,
            schoolId,
            matricule: `PRE-${Date.now().toString().slice(-6)}`,
            lastName: lastName.toUpperCase(),
            firstName,
            dateOfBirth: dateOfBirth || '',
            placeOfBirth: '',
            gender,
            address: '',
            previousSchool: '',
            photoURL: `https://picsum.photos/seed/${studentId}/200`,
            status: 'En attente', // Reste en attente jusqu'à validation du paiement
            classId,
            class: className,
            cycle: cycleId,
            grade: gradeName,
            parent1LastName: parent1LastName.toUpperCase(),
            parent1FirstName,
            parent1Contact,
            parent2LastName: '',
            parent2FirstName: '',
            parent2Contact: '',
            parentIds: [],
            tuitionFee: tuitionFee,
            discountAmount: 0,
            discountReason: '',
            amountDue: tuitionFee,
            tuitionStatus: 'Non payé',
            feedback: 'Inscription en ligne parent',
            inscriptionYear,
            enrollments: [{
                academicYear: currentAcademicYear,
                classId,
                status: 'En attente',
                tuitionFee,
                amountDue: tuitionFee,
                tuitionStatus: 'Non payé',
                createdAt: new Date().toISOString(),
                createdBy: 'parent-portal'
            }],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: 'parent-portal'
        };

        const batch = db.batch();
        batch.set(newStudentDoc, studentData);

        // Mettre à jour l'effectif de la classe
        batch.update(classRef, { studentCount: FieldValue.increment(1) });

        // Mettre à jour les statistiques financières globales de l'école
        const statsRef = db.doc(`ecoles/${schoolId}/stats/finance`);
        batch.set(statsRef, {
            totalTuitionFees: FieldValue.increment(tuitionFee),
            totalAmountDue: FieldValue.increment(tuitionFee),
            studentCount: FieldValue.increment(1),
            lastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });

        await batch.commit();

        // 2. Si les frais sont de 0, on valide l'inscription immédiatement sans passer par le gateway
        if (tuitionFee <= 0) {
            const successBatch = db.batch();
            successBatch.update(newStudentDoc, {
                status: 'Actif',
                tuitionStatus: 'Soldé'
            });
            await successBatch.commit();

            const BASE_URL = resolveBaseUrl(req);
            return NextResponse.json({
                success: true,
                redirectUrl: `${BASE_URL}/payment/success?type=tuition`
            });
        }

        // 3. Générer le lien de paiement en appelant notre API gateway existante
        const BASE_URL = resolveBaseUrl(req);
        const gatewayUrl = `${BASE_URL}/api/gateway/create-link`;

        console.log(`[ParentRegAPI] Calling gateway API: ${gatewayUrl} for student: ${studentId}, amount: ${tuitionFee}`);

        const gatewayResponse = await fetch(gatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider: paymentProvider,
                type: 'tuition',
                schoolId,
                studentId,
                amount: tuitionFee,
                phone: parent1Contact,
                userEmail: '',
                userDisplayName: `${parent1FirstName} ${parent1LastName}`,
            }),
        });

        const gatewayResult = await gatewayResponse.json().catch(() => ({}));

        if (!gatewayResponse.ok || !gatewayResult.url) {
            const errorMsg = gatewayResult.error || `Erreur ${gatewayResponse.status} lors de l'appel à la passerelle.`;
            console.error(`[ParentRegAPI] Gateway error: ${errorMsg}`);
            throw new Error(errorMsg);
        }

        return NextResponse.json({
            success: true,
            redirectUrl: gatewayResult.url
        });

    } catch (error: any) {
        console.error("[ParentRegAPI] Error during parent registration:", error);

        // Nettoyage en cas d'erreur après la création de l'élève en base
        if (createdStudentPath) {
            try {
                console.log(`[ParentRegAPI] Cleaning up failed registration student doc: ${createdStudentPath}`);
                const studentRef = db.doc(createdStudentPath);
                
                // On décrémente les statistiques et effectifs car l'inscription a échoué
                const classId = studentId ? (await studentRef.get()).data()?.classId : null;
                const batch = db.batch();
                batch.delete(studentRef);

                if (classId) {
                    const classRef = db.collection(`ecoles/${schoolId}/classes`).doc(classId);
                    batch.update(classRef, { studentCount: FieldValue.increment(-1) });
                }

                const statsRef = db.doc(`ecoles/${schoolId}/stats/finance`);
                batch.update(statsRef, {
                    studentCount: FieldValue.increment(-1),
                    lastUpdated: FieldValue.serverTimestamp()
                });

                await batch.commit();
            } catch (cleanupError) {
                console.error("[ParentRegAPI] Cleanup failed:", cleanupError);
            }
        }

        return NextResponse.json({ error: error.message || "Impossible de finaliser l'inscription ou de générer le lien de paiement." }, { status: 500 });
    }
}
