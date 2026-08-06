import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

async function requireAdmin(request: NextRequest): Promise<{ uid: string } | { error: string; status: number }> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Missing Authorization header', status: 401 };
    }
    const token = authHeader.slice(7);
    let decoded;
    try {
        decoded = await getAdminAuth().verifyIdToken(token);
    } catch (err) {
        console.error('[Admin Decisions] verifyIdToken failed', err);
        return { error: 'Invalid token', status: 401 };
    }
    const userSnap = await getAdminDb().collection('users').doc(decoded.uid).get();
    const profile = userSnap.data()?.profile;
    if (!profile?.isAdmin) {
        return { error: 'Admin access required', status: 403 };
    }
    return { uid: decoded.uid };
}

function serialize(doc: FirebaseFirestore.QueryDocumentSnapshot) {
    const data = doc.data();
    return {
        id: doc.id,
        type: data.type ?? 'custom',
        title: data.title ?? '—',
        description: data.description ?? '',
        schoolId: data.schoolId ?? null,
        schoolName: data.schoolName ?? null,
        source: data.source ?? '—',
        status: data.status ?? 'pending',
        proposedAction: data.proposedAction ?? { kind: 'none' },
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        decidedAt: data.decidedAt?.toDate?.()?.toISOString() ?? null,
        decidedByEmail: data.decidedByEmail ?? null,
        decisionNote: data.decisionNote ?? null,
        executionResult: data.executionResult ?? null,
    };
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = getAdminDb();

    const [pendingSnap, decidedSnap] = await Promise.all([
        db.collection('decision_queue')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get(),
        // Les docs en attente n'ont pas de champ decidedAt : les trier dessus
        // renvoie donc uniquement l'historique, sans index composite.
        db.collection('decision_queue')
            .orderBy('decidedAt', 'desc')
            .limit(50)
            .get(),
    ]);

    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        pending: pendingSnap.docs.map(serialize),
        decided: decidedSnap.docs.map(serialize),
    });
}
