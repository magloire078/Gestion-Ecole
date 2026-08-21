import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { school as SchoolData, staff as Staff, user_root } from '@/lib/data-types';

/**
 * Retirer un membre du personnel touche deux documents distincts :
 * ecoles/{schoolId}/personnel/{staffId} (le profil) et users/{staffId}
 * (le document racine d'un AUTRE utilisateur que l'appelant). Les règles
 * Firestore n'autorisent l'écriture de users/{uid} qu'à son propre
 * titulaire (ou à un super-admin) — un directeur retirant un collègue ne
 * peut donc pas faire ce second write depuis le client, et comme les deux
 * écritures sont dans le même batch, tout échoue. D'où cette route
 * serveur (SDK admin), qui reproduit exactement la logique de
 * hasPermission(schoolId, 'manageUsers') des règles avant d'agir.
 */
async function hasManageUsersPermission(db: FirebaseFirestore.Firestore, uid: string, schoolId: string): Promise<boolean> {
    const userSnap = await db.doc(`users/${uid}`).get();
    const userData = userSnap.data() as user_root | undefined;
    if (userData?.isSuperAdmin === true) return true;

    const schoolSnap = await db.doc(`ecoles/${schoolId}`).get();
    const schoolData = schoolSnap.data() as SchoolData | undefined;
    if (schoolData?.directorId === uid) return true;
    if (userData?.schools?.[schoolId] === 'directeur') return true;

    const staffSnap = await db.doc(`ecoles/${schoolId}/personnel/${uid}`).get();
    const staffData = staffSnap.data() as Staff | undefined;
    if (staffData?.adminRole) {
        const roleSnap = await db.doc(`ecoles/${schoolId}/admin_roles/${staffData.adminRole}`).get();
        if (roleSnap.data()?.permissions?.manageUsers === true) return true;
    }

    return false;
}

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    let callerUid: string;
    try {
        const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
        callerUid = decoded.uid;
    } catch (err) {
        console.error('[staff/remove] verifyIdToken failed', err);
        return NextResponse.json({ error: 'Session invalide, reconnectez-vous.' }, { status: 401 });
    }

    let body: { schoolId?: string; staffId?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }

    const { schoolId, staffId } = body;
    if (!schoolId || !staffId) {
        return NextResponse.json({ error: "L'ID de l'école et du membre du personnel sont requis." }, { status: 400 });
    }

    const db = getAdminDb();

    const authorized = await hasManageUsersPermission(db, callerUid, schoolId);
    if (!authorized) {
        return NextResponse.json({ error: "Vous n'avez pas la permission de gérer le personnel de cette école." }, { status: 403 });
    }

    const batch = db.batch();
    batch.delete(db.doc(`ecoles/${schoolId}/personnel/${staffId}`));

    const staffUserRef = db.doc(`users/${staffId}`);
    const staffUserSnap = await staffUserRef.get();
    if (staffUserSnap.exists) {
        const staffUserData = staffUserSnap.data() as user_root;
        const update: Record<string, unknown> = {
            [`schools.${schoolId}`]: FieldValue.delete(),
        };
        if (staffUserData.activeSchoolId === schoolId) {
            const remainingSchoolIds = Object.keys(staffUserData.schools || {}).filter(id => id !== schoolId);
            update.activeSchoolId = remainingSchoolIds.length > 0 ? remainingSchoolIds[0] : null;
        }
        batch.update(staffUserRef, update);
    }

    await batch.commit();

    return NextResponse.json({ ok: true });
}
