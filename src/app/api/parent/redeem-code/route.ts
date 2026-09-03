import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Liaison d'un parent à un ou plusieurs élèves via un code d'accès.
 *
 * Tout est fait côté serveur avec firebase-admin, pour deux raisons :
 *  1. Sécurité : le client ne lit plus la collection `sessions_parents`
 *     (qui contient les codes d'accès), ce qui permet de fermer sa lecture
 *     publique dans firestore.rules.
 *  2. Correction : la liaison écrit dans `eleves/{id}.parentIds` et désactive
 *     la session — deux opérations que les règles réservent au personnel
 *     habilité / super-admin, donc irréalisables par le parent côté client.
 *     L'Admin SDK contourne les règles et rend la liaison fiable.
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Authentification : jeton d'ID Firebase dans l'en-tête Authorization.
        const authHeader = req.headers.get('authorization') || '';
        const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
        if (!tokenMatch) {
            return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
        }

        let decoded;
        try {
            decoded = await getAdminAuth().verifyIdToken(tokenMatch[1]);
        } catch {
            return NextResponse.json({ error: 'Session invalide, veuillez vous reconnecter.' }, { status: 401 });
        }
        const uid = decoded.uid;

        // 2. Entrée.
        const body = await req.json().catch(() => ({}));
        const accessCode = typeof body?.accessCode === 'string' ? body.accessCode.trim() : '';
        if (!accessCode) {
            return NextResponse.json({ error: 'Code d\'accès requis.' }, { status: 400 });
        }

        const db = getAdminDb();

        // 3. Recherche de la session active correspondant au code (Admin SDK).
        const snap = await db.collection('sessions_parents')
            .where('accessCode', '==', accessCode)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (snap.empty) {
            return NextResponse.json({ error: 'Code incorrect ou expiré.' }, { status: 404 });
        }

        const sessionDoc = snap.docs[0];
        const session = sessionDoc.data() as {
            schoolId?: string;
            studentIds?: string[];
            expiresAt?: string;
        };

        // 4. Contrôle d'expiration (le flux client historique ne le vérifiait pas).
        if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
            await sessionDoc.ref.update({ isActive: false });
            return NextResponse.json({ error: 'Code incorrect ou expiré.' }, { status: 404 });
        }

        const schoolId = session.schoolId;
        const studentIds = Array.isArray(session.studentIds) ? session.studentIds : [];
        if (!schoolId || studentIds.length === 0) {
            return NextResponse.json({ error: 'Session invalide.' }, { status: 400 });
        }

        // 5. Liaison atomique (Admin SDK contourne les règles).
        const batch = db.batch();

        const userRef = db.doc(`users/${uid}`);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? (userSnap.data() || {}) : {};
        const currentSchools = (userData.schools as Record<string, string>) || {};
        batch.set(userRef, {
            schools: { ...currentSchools, [schoolId]: 'parent' },
            activeSchoolId: schoolId,
        }, { merge: true });

        const parentRef = db.doc(`ecoles/${schoolId}/parents/${uid}`);
        const parentSnap = await parentRef.get();
        const existingStudentIds: string[] = parentSnap.exists ? (parentSnap.data()?.studentIds || []) : [];
        const mergedStudentIds = Array.from(new Set([...existingStudentIds, ...studentIds]));
        batch.set(parentRef, {
            uid,
            email: decoded.email || userData.email || '',
            displayName: decoded.name || userData.displayName || '',
            photoURL: decoded.picture || userData.photoURL || '',
            schoolId,
            studentIds: mergedStudentIds,
        }, { merge: true });

        // On n'ajoute le parent qu'aux élèves qui existent réellement (pas de
        // création de doc élève fantôme via un merge sur un chemin inexistant).
        for (const studentId of studentIds) {
            const studentRef = db.doc(`ecoles/${schoolId}/eleves/${studentId}`);
            const studentSnap = await studentRef.get();
            if (studentSnap.exists) {
                batch.update(studentRef, { parentIds: FieldValue.arrayUnion(uid) });
            }
        }

        // Code à usage unique : on désactive la session.
        batch.update(sessionDoc.ref, { isActive: false });

        await batch.commit();

        return NextResponse.json({ success: true, schoolId });
    } catch (error: any) {
        console.error('[ParentRedeemAPI] Erreur:', error);
        return NextResponse.json({ error: 'Échec de la liaison.' }, { status: 500 });
    }
}
