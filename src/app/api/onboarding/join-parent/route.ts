import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import type { parent as Parent, parent_session, user_root } from '@/lib/data-types';

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
        console.error('[join-parent] verifyIdToken failed', err);
        return NextResponse.json({ error: 'Session invalide, reconnectez-vous.' }, { status: 401 });
    }

    let body: { accessCode?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
    }

    const accessCode = body.accessCode?.trim();
    if (!accessCode) {
        return NextResponse.json({ error: "Le code d'accès est requis." }, { status: 400 });
    }

    const authUser = await getAdminAuth().getUser(uid);
    const email = authUser.email || null;
    const displayName = authUser.displayName || null;
    const photoURL = authUser.photoURL || null;

    const db = getAdminDb();

    const sessionsSnap = await db.collection('sessions_parents')
        .where('accessCode', '==', accessCode)
        .where('isActive', '==', true)
        .limit(1)
        .get();
    if (sessionsSnap.empty) {
        return NextResponse.json({ error: 'Code incorrect ou expiré.' }, { status: 404 });
    }
    const sessionDoc = sessionsSnap.docs[0];
    const sessionData = sessionDoc.data() as parent_session;
    const schoolId = sessionData.schoolId;
    const studentIds = sessionData.studentIds || [];
    if (!schoolId) {
        return NextResponse.json({ error: "Session d'accès invalide." }, { status: 400 });
    }

    const batch = db.batch();

    const userRootRef = db.doc(`users/${uid}`);
    const userRootSnap = await userRootRef.get();
    const currentSchools = userRootSnap.exists ? ((userRootSnap.data() as user_root).schools || {}) : {};
    batch.set(userRootRef, {
        schools: { ...currentSchools, [schoolId]: 'parent' },
        activeSchoolId: schoolId,
    }, { merge: true });

    const parentProfileRef = db.doc(`ecoles/${schoolId}/parents/${uid}`);
    const parentProfileSnap = await parentProfileRef.get();
    const existingStudentIds = parentProfileSnap.exists ? ((parentProfileSnap.data() as Parent).studentIds || []) : [];
    const newStudentIds = [...new Set([...existingStudentIds, ...studentIds])];
    batch.set(parentProfileRef, {
        uid, email, displayName, photoURL, schoolId, studentIds: newStudentIds,
    }, { merge: true });

    for (const studentId of studentIds) {
        const studentRef = db.doc(`ecoles/${schoolId}/eleves/${studentId}`);
        const studentSnap = await studentRef.get();
        if (studentSnap.exists) {
            const parentIds = [...new Set([...(studentSnap.data()?.parentIds || []), uid])];
            batch.update(studentRef, { parentIds });
        }
    }

    batch.update(sessionDoc.ref, { isActive: false });

    await batch.commit();

    return NextResponse.json({ ok: true, schoolId });
}
