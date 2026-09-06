import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import type { staff as Staff, user_root } from '@/lib/data-types';

// Rôles qu'un utilisateur peut s'auto-attribuer en rejoignant une école avec
// un simple code. 'directeur' et les rôles à privilèges (adminRole, isAdmin)
// ne peuvent être accordés que par un directeur/admin via la gestion du
// personnel — jamais par ce endpoint.
const JOINABLE_ROLES = ['enseignant', 'secretaire', 'comptable', 'surveillant', 'personnel'] as const;
type JoinableRole = typeof JOINABLE_ROLES[number];

function isJoinableRole(value: unknown): value is JoinableRole {
    return typeof value === 'string' && (JOINABLE_ROLES as readonly string[]).includes(value);
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
        console.error('[join-school] verifyIdToken failed', err);
        return NextResponse.json({ error: 'Session invalide, reconnectez-vous.' }, { status: 401 });
    }

    let body: { schoolCode?: string; role?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }

    const schoolCode = body.schoolCode?.trim().toUpperCase();
    if (!schoolCode) {
        return NextResponse.json({ error: "Le code de l'établissement est requis." }, { status: 400 });
    }
    const requestedRole: JoinableRole = isJoinableRole(body.role) ? body.role : 'enseignant';

    const authUser = await getAdminAuth().getUser(uid);
    const email = authUser.email;
    const displayName = authUser.displayName;
    if (!email || !displayName) {
        return NextResponse.json({ error: 'Profil incomplet : nom et email requis avant de rejoindre un établissement.' }, { status: 400 });
    }

    const db = getAdminDb();

    const schoolsSnap = await db.collection('ecoles').where('schoolCode', '==', schoolCode).limit(1).get();
    if (schoolsSnap.empty) {
        return NextResponse.json({ error: 'Aucun établissement trouvé pour ce code.' }, { status: 404 });
    }
    const schoolDoc = schoolsSnap.docs[0];
    const schoolId = schoolDoc.id;
    const schoolName = (schoolDoc.data().name as string | undefined) || 'votre établissement';

    // Réconciliation : un profil personnel avec cet email peut déjà exister
    // (créé par le directeur avant l'inscription effective, avec un ID
    // aléatoire). On le retrouve pour fusionner ses données au lieu de créer
    // un doublon.
    const existingStaffSnap = await db
        .collection(`ecoles/${schoolId}/personnel`)
        .where('email', '==', email)
        .limit(1)
        .get();
    const existingStaff = existingStaffSnap.empty
        ? null
        : ({ id: existingStaffSnap.docs[0].id, ...existingStaffSnap.docs[0].data() } as Staff & { id: string });

    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const staffProfileData: Omit<Staff, 'id'> = {
        ...(existingStaff as any),
        uid,
        email,
        displayName,
        photoURL: authUser.photoURL || existingStaff?.photoURL || '',
        schoolId,
        role: (existingStaff?.role || requestedRole) as any,
        firstName: existingStaff?.firstName || firstName,
        lastName: existingStaff?.lastName || lastName,
        hireDate: existingStaff?.hireDate || new Date().toISOString().split('T')[0],
        baseSalary: existingStaff?.baseSalary || 0,
        status: 'Actif',
        isAdmin: existingStaff?.isAdmin || false,
    };

    const batch = db.batch();

    const staffProfileRef = db.doc(`ecoles/${schoolId}/personnel/${uid}`);
    batch.set(staffProfileRef, staffProfileData);

    if (existingStaff && existingStaff.id !== uid) {
        batch.delete(db.doc(`ecoles/${schoolId}/personnel/${existingStaff.id}`));
    }

    const userRootRef = db.doc(`users/${uid}`);
    const userRootSnap = await userRootRef.get();
    const currentSchools = userRootSnap.exists ? ((userRootSnap.data() as user_root).schools || {}) : {};
    const updatedSchools = { ...currentSchools, [schoolId]: staffProfileData.role };
    batch.set(userRootRef, { schools: updatedSchools, activeSchoolId: schoolId }, { merge: true });

    await batch.commit();

    return NextResponse.json({ ok: true, schoolId, schoolName });
}
