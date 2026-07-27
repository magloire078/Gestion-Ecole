import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

async function requireAdmin(request: NextRequest): Promise<
    { uid: string; email: string | null } | { error: string; status: number }
> {
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
    return { uid: decoded.uid, email: decoded.email ?? null };
}

interface ProposedAction {
    kind?: 'email' | 'none';
    to?: string;
    subject?: string;
    body?: string;
}

/**
 * Exécute l'action proposée d'une décision approuvée.
 * Retourne un libellé du résultat pour l'historique.
 */
async function executeAction(
    action: ProposedAction,
    context: { schoolId: string | null; title: string; adminUid: string; adminEmail: string | null },
): Promise<string> {
    const db = getAdminDb();

    if (action.kind === 'email' && action.to && action.body) {
        await db.collection('mail').add({
            to: action.to,
            message: {
                subject: action.subject ?? 'Message de l\'équipe GèreEcole',
                html: `<div style="font-family: sans-serif; line-height: 1.6; white-space: pre-wrap;">${action.body.replace(/\n/g, '<br/>')}</div>`,
                text: action.body,
            },
            delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
            decisionQueue: true,
        });

        // Trace le contact dans le journal CRM de l'école pour l'historique.
        if (context.schoolId) {
            await db.collection(`crm_interactions/${context.schoolId}/entries`).add({
                type: 'email',
                note: `Email envoyé via la boîte de décisions : « ${context.title} »`,
                nextActionDate: null,
                nextActionNote: null,
                createdBy: context.adminUid,
                createdByEmail: context.adminEmail,
                createdAt: FieldValue.serverTimestamp(),
            });
            await db.doc(`crm_interactions/${context.schoolId}`).set({
                schoolId: context.schoolId,
                lastContactAt: FieldValue.serverTimestamp(),
                lastContactType: 'email',
                updatedBy: context.adminUid,
            }, { merge: true });
        }

        return `Email envoyé à ${action.to}`;
    }

    return 'Décision enregistrée (aucune action automatique)';
}

export async function POST(
    request: NextRequest,
    { params }: { params: { decisionId: string } },
) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const decision = body?.decision;
    if (decision !== 'approve' && decision !== 'reject') {
        return NextResponse.json({ error: 'decision must be "approve" or "reject"' }, { status: 400 });
    }
    const note = typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 1000) : null;

    const ref = getAdminDb().collection('decision_queue').doc(params.decisionId);
    const snap = await ref.get();
    if (!snap.exists) {
        return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }
    const data = snap.data() as { status?: string; title?: string; schoolId?: string | null; proposedAction?: ProposedAction };
    if (data.status !== 'pending') {
        return NextResponse.json({ error: 'Cette décision a déjà été traitée.' }, { status: 409 });
    }

    const base = {
        decidedAt: FieldValue.serverTimestamp(),
        decidedBy: auth.uid,
        decidedByEmail: auth.email,
        decisionNote: note,
    };

    if (decision === 'reject') {
        await ref.update({ ...base, status: 'rejected' });
        return NextResponse.json({ ok: true, status: 'rejected' });
    }

    try {
        const executionResult = await executeAction(data.proposedAction ?? { kind: 'none' }, {
            schoolId: data.schoolId ?? null,
            title: data.title ?? '—',
            adminUid: auth.uid,
            adminEmail: auth.email,
        });
        await ref.update({ ...base, status: 'approved', executionResult });
        return NextResponse.json({ ok: true, status: 'approved', executionResult });
    } catch (err: any) {
        console.error('[Admin Decisions] execution failed', err);
        await ref.update({ ...base, status: 'failed', executionResult: err?.message ?? 'Erreur d\'exécution' });
        return NextResponse.json({ error: 'L\'action a échoué : ' + (err?.message ?? 'erreur inconnue') }, { status: 500 });
    }
}
