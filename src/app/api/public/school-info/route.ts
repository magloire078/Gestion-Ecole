import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json({ error: "L'identifiant de l'école (schoolId) est requis." }, { status: 400 });
        }

        const db = getAdminDb();
        const schoolDoc = await db.collection('ecoles').doc(schoolId).get();

        if (!schoolDoc.exists) {
            return NextResponse.json({ error: "Établissement non trouvé." }, { status: 404 });
        }

        const schoolData = schoolDoc.data();

        // Si l'école est désactivée ou supprimée, on bloque
        if (schoolData?.status === 'deleted') {
            return NextResponse.json({ error: "Cet établissement n'est plus actif." }, { status: 403 });
        }

        // Charger les classes, frais de scolarité, et niveaux
        const classesSnapshot = await db.collection(`ecoles/${schoolId}/classes`).get();
        const classes = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const feesSnapshot = await db.collection(`ecoles/${schoolId}/frais_scolarite`).get();
        const fees = feesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const niveauxSnapshot = await db.collection(`ecoles/${schoolId}/niveaux`).get();
        const niveaux = niveauxSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const responseData = {
            school: {
                id: schoolId,
                name: schoolData?.name || 'Établissement Scolaire',
                logoUrl: schoolData?.logoUrl || schoolData?.photoUrl || null,
                currentAcademicYear: schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            },
            classes,
            fees,
            niveaux
        };

        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error("[SchoolInfoAPI] Error fetching school public data:", error);
        return NextResponse.json({ error: "Erreur interne du serveur lors de la récupération des informations." }, { status: 500 });
    }
}
