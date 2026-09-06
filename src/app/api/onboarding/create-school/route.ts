import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { school as SchoolData, staff as Staff, user_root } from '@/lib/data-types';

interface CreateSchoolBody {
    name?: string;
    country?: string;
    region?: string;
    drena?: string;
    address?: string;
    phone?: string;
    email?: string;
    mainLogoUrl?: string;
}

function generateSchoolCode(name: string): string {
    const prefix = name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNumber}`;
}

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    let uid: string;
    try {
        const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
        uid = decoded.uid;
    } catch (err) {
        console.error('[create-school] verifyIdToken failed', err);
        return NextResponse.json({ error: 'Session invalide, reconnectez-vous.' }, { status: 401 });
    }

    let body: CreateSchoolBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name || name.length < 3) {
        return NextResponse.json({ error: "Le nom de l'école doit comporter au moins 3 caractères." }, { status: 400 });
    }

    const authUser = await getAdminAuth().getUser(uid);
    const directorEmail = authUser.email || body.email || '';
    const nameParts = (authUser.displayName || 'Directeur').split(' ');
    const directorFirstName = nameParts[0] || 'Directeur';
    const directorLastName = nameParts.slice(1).join(' ') || '';

    const db = getAdminDb();

    // Un directeur ne peut créer une nouvelle école que si toutes ses écoles
    // existantes ont un abonnement actif (pas juste un essai en cours).
    const existingSchoolsSnap = await db.collection('ecoles').where('directorId', '==', uid).get();
    if (!existingSchoolsSnap.empty) {
        const hasActiveSubscription = existingSchoolsSnap.docs.some(doc => {
            const school = doc.data() as SchoolData;
            return school.subscription?.status === 'active';
        });
        if (!hasActiveSubscription) {
            return NextResponse.json({
                error: 'SUBSCRIPTION_REQUIRED: Vous devez avoir au moins un établissement avec un abonnement actif pour créer une nouvelle école. L\'école actuelle est toujours en période d\'essai.',
            }, { status: 400 });
        }
    }

    const schoolRef = db.collection('ecoles').doc();
    const schoolId = schoolRef.id;
    const schoolCode = generateSchoolCode(name);

    const schoolData: Omit<SchoolData, 'id'> = {
        name,
        country: body.country || 'CI',
        region: body.region || '',
        drena: body.drena,
        address: body.address || '',
        phone: body.phone || '',
        email: body.email || '',
        mainLogoUrl: body.mainLogoUrl || '',
        website: '',
        directorId: uid,
        directorFirstName,
        directorLastName,
        directorEmail,
        schoolCode,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: 'active',
        subscription: {
            plan: 'Essentiel',
            status: 'trialing',
            startDate: new Date().toISOString(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
            maxStudents: 50,
            maxCycles: 5,
        },
    };

    const batch = db.batch();
    batch.set(schoolRef, schoolData);

    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        batch.set(userRef, {
            uid,
            email: directorEmail,
            schools: { [schoolId]: 'directeur' },
            activeSchoolId: schoolId,
            displayName: `${directorFirstName} ${directorLastName}`.trim(),
            createdAt: FieldValue.serverTimestamp(),
        });
    } else {
        const currentSchools = (userSnap.data() as user_root).schools || {};
        batch.set(userRef, {
            schools: { ...currentSchools, [schoolId]: 'directeur' },
            activeSchoolId: schoolId,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    const personnelRef = db.doc(`ecoles/${schoolId}/personnel/${uid}`);
    const personnelData: Omit<Staff, 'id'> = {
        uid,
        schoolId,
        firstName: directorFirstName,
        lastName: directorLastName,
        displayName: `${directorFirstName} ${directorLastName}`,
        email: directorEmail,
        role: 'directeur',
        status: 'Actif',
        hireDate: new Date().toISOString().split('T')[0],
        baseSalary: 0,
        photoURL: '',
    };
    batch.set(personnelRef, personnelData);

    await batch.commit();

    try {
        await db.collection('mail').add({
            to: directorEmail,
            message: {
                subject: `Bienvenue sur GèreEcole - ${name}`,
                html: `
                    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                        <h1 style="color: #0C365A;">Bienvenue, ${directorFirstName} !</h1>
                        <p>Nous sommes ravis de vous compter parmi nous. Votre école <strong>${name}</strong> a été créée avec succès sur GèreEcole.</p>
                        <p>Vous pouvez dès maintenant commencer à configurer vos classes, ajouter votre personnel et inscrire vos premiers élèves.</p>
                        <div style="margin: 20px 0;">
                            <a href="https://www.gerecole.com/dashboard" style="background-color: #2D9CDB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accéder à mon tableau de bord</a>
                        </div>
                        <p>Si vous avez besoin d'aide, n'hésitez pas à consulter notre centre d'aide ou à contacter notre support.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 0.8em; color: #777;">L'équipe GèreEcole</p>
                    </div>
                `,
            },
            delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
        });
    } catch (mailError) {
        console.error('[create-school] Failed to send welcome email:', mailError);
    }

    return NextResponse.json({ success: true, schoolId, schoolCode });
}
