import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireSuperAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * Gestion de l'accès "Commercial" (restreint au pipeline prospects). Réservé
 * aux super-admins : un commercial ne peut jamais s'accorder ce rôle à
 * lui-même ni l'accorder à quelqu'un d'autre (cf. requireSuperAdmin, pas
 * requireSuperAdminOrCommercial).
 *
 * Recherche par email via l'Admin SDK (getUserByEmail) plutôt que par
 * fiche personnel d'école : un commercial n'appartient à aucune école
 * cliente, il ne peut donc pas être trouvé via collectionGroup('personnel')
 * comme le fait le flux d'octroi super-admin existant.
 */

export async function GET(request: NextRequest) {
    const auth = await requireSuperAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const snap = await getAdminDb().collection('users').where('commercialAccess', '==', true).get();
    const commercials = await Promise.all(snap.docs.map(async doc => {
        try {
            const authUser = await getAdminAuth().getUser(doc.id);
            return {
                uid: doc.id,
                email: authUser.email ?? null,
                displayName: authUser.displayName ?? null,
                photoURL: authUser.photoURL ?? null,
            };
        } catch {
            return { uid: doc.id, email: null, displayName: null, photoURL: null };
        }
    }));

    return NextResponse.json({ commercials });
}

export async function POST(request: NextRequest) {
    const auth = await requireSuperAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) {
        return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    let targetUser;
    try {
        targetUser = await getAdminAuth().getUserByEmail(email);
    } catch {
        return NextResponse.json({
            error: "Aucun compte n'existe pour cet email. La personne doit d'abord créer un compte (page d'inscription) avant de pouvoir recevoir l'accès commercial.",
        }, { status: 404 });
    }

    const db = getAdminDb();
    await db.collection('users').doc(targetUser.uid).set({ commercialAccess: true }, { merge: true });
    await db.collection('system_logs').add({
        adminId: auth.uid,
        action: 'commercial.grant',
        target: `users/${targetUser.uid}`,
        details: { grantedToEmail: email },
        timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, uid: targetUser.uid, email: targetUser.email ?? email, displayName: targetUser.displayName ?? null });
}

export async function DELETE(request: NextRequest) {
    const auth = await requireSuperAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const uid = typeof body?.uid === 'string' ? body.uid.trim() : '';
    if (!uid) {
        return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('users').doc(uid).set({ commercialAccess: false }, { merge: true });
    await db.collection('system_logs').add({
        adminId: auth.uid,
        action: 'commercial.revoke',
        target: `users/${uid}`,
        details: {},
        timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
}
