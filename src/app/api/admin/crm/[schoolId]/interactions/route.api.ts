import { NextRequest, NextResponse } from 'next/server';
import { withCors, corsPreflight } from '@/lib/api-cors';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const INTERACTION_TYPES = ['appel', 'email', 'whatsapp', 'visite', 'note'] as const;
type InteractionType = (typeof INTERACTION_TYPES)[number];

interface InteractionEntry {
    id: string;
    type: InteractionType;
    note: string;
    nextActionDate: string | null;
    nextActionNote: string | null;
    createdBy: string;
    createdByEmail: string | null;
    createdAt: string | null;
}

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
        console.error('[Admin CRM] verifyIdToken failed', err);
        return { error: 'Invalid token', status: 401 };
    }
    const userSnap = await getAdminDb().collection('users').doc(decoded.uid).get();
    const profile = userSnap.data()?.profile;
    if (!profile?.isAdmin) {
        return { error: 'Admin access required', status: 403 };
    }
    return { uid: decoded.uid, email: decoded.email ?? null };
}

function entriesCollection(schoolId: string) {
    return getAdminDb().collection(`crm_interactions/${schoolId}/entries`);
}

async function GETHandler(
    request: NextRequest,
    { params }: { params: { schoolId: string } },
) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { schoolId } = params;
    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    const snap = await entriesCollection(schoolId)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

    const entries: InteractionEntry[] = snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            type: data.type ?? 'note',
            note: data.note ?? '',
            nextActionDate: data.nextActionDate ?? null,
            nextActionNote: data.nextActionNote ?? null,
            createdBy: data.createdBy ?? '',
            createdByEmail: data.createdByEmail ?? null,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        };
    });

    return NextResponse.json({ entries });
}

async function POSTHandler(
    request: NextRequest,
    { params }: { params: { schoolId: string } },
) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { schoolId } = params;
    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    const schoolSnap = await getAdminDb().collection('ecoles').doc(schoolId).get();
    if (!schoolSnap.exists) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const type = body?.type;
    const note = typeof body?.note === 'string' ? body.note.trim() : '';
    const nextActionDate = typeof body?.nextActionDate === 'string' && body.nextActionDate ? body.nextActionDate : null;
    const nextActionNote = typeof body?.nextActionNote === 'string' && body.nextActionNote.trim() ? body.nextActionNote.trim() : null;

    if (!INTERACTION_TYPES.includes(type)) {
        return NextResponse.json({ error: `type must be one of: ${INTERACTION_TYPES.join(', ')}` }, { status: 400 });
    }
    if (!note) {
        return NextResponse.json({ error: 'note is required' }, { status: 400 });
    }
    if (note.length > 5000) {
        return NextResponse.json({ error: 'note is too long (max 5000 characters)' }, { status: 400 });
    }
    if (nextActionDate && Number.isNaN(new Date(nextActionDate).getTime())) {
        return NextResponse.json({ error: 'nextActionDate must be a valid date (YYYY-MM-DD)' }, { status: 400 });
    }

    const entry = {
        type,
        note,
        nextActionDate,
        nextActionNote,
        createdBy: auth.uid,
        createdByEmail: auth.email,
        createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await entriesCollection(schoolId).add(entry);

    // Summary doc so future views (fiche école, relances) can read the last
    // contact and the next planned action without scanning the entries.
    await getAdminDb().doc(`crm_interactions/${schoolId}`).set({
        schoolId,
        schoolName: schoolSnap.data()?.name ?? null,
        lastContactAt: FieldValue.serverTimestamp(),
        lastContactType: type,
        nextActionDate,
        nextActionNote,
        updatedBy: auth.uid,
    }, { merge: true });

    return NextResponse.json({ ok: true, id: ref.id });
}

/** Marque la prochaine action planifiée comme faite (vue « Actions du jour »). */
async function PATCHHandler(
    request: NextRequest,
    { params }: { params: { schoolId: string } },
) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { schoolId } = params;
    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (body?.clearNextAction !== true) {
        return NextResponse.json({ error: 'Only { clearNextAction: true } is supported' }, { status: 400 });
    }

    const ref = getAdminDb().doc(`crm_interactions/${schoolId}`);
    const snap = await ref.get();
    if (!snap.exists) {
        return NextResponse.json({ error: 'No journal for this school' }, { status: 404 });
    }

    await ref.set({
        nextActionDate: null,
        nextActionNote: null,
        updatedBy: auth.uid,
    }, { merge: true });

    return NextResponse.json({ ok: true });
}


// Appelée depuis l'application mobile : la requête est inter-origines, d'où CORS.
export function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export const GET = withCors(GETHandler);

export const POST = withCors(POSTHandler);

export const PATCH = withCors(PATCHHandler);
