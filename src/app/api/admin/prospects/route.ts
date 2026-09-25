import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireSuperAdminOrCommercial as requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const STAGES = ['contacte', 'demo', 'essai', 'converti', 'perdu'] as const;
type Stage = (typeof STAGES)[number];

interface ProspectPayload {
    schoolName: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    stage: Stage;
    notes: string | null;
    nextActionDate: string | null;
}

function parsePayload(body: any): ProspectPayload | { error: string } {
    const schoolName = typeof body?.schoolName === 'string' ? body.schoolName.trim() : '';
    if (!schoolName) return { error: 'schoolName is required' };
    if (schoolName.length > 200) return { error: 'schoolName is too long' };

    const stage = body?.stage ?? 'contacte';
    if (!STAGES.includes(stage)) return { error: `stage must be one of: ${STAGES.join(', ')}` };

    const str = (v: any, max = 500) =>
        typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

    const nextActionDate = str(body?.nextActionDate, 10);
    if (nextActionDate && Number.isNaN(new Date(nextActionDate).getTime())) {
        return { error: 'nextActionDate must be a valid date (YYYY-MM-DD)' };
    }

    return {
        schoolName,
        contactName: str(body?.contactName, 200),
        phone: str(body?.phone, 40),
        email: str(body?.email, 200),
        city: str(body?.city, 120),
        stage,
        notes: str(body?.notes, 5000),
        nextActionDate,
    };
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const snap = await getAdminDb().collection('crm_prospects')
        .orderBy('updatedAt', 'desc')
        .limit(500)
        .get();

    const prospects = snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            schoolName: data.schoolName ?? '—',
            contactName: data.contactName ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            city: data.city ?? null,
            stage: STAGES.includes(data.stage) ? data.stage : 'contacte',
            notes: data.notes ?? null,
            nextActionDate: data.nextActionDate ?? null,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
        };
    });

    return NextResponse.json({ prospects });
}

export async function POST(request: NextRequest) {
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

    const payload = parsePayload(body);
    if ('error' in payload) {
        return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const ref = await getAdminDb().collection('crm_prospects').add({
        ...payload,
        createdBy: auth.uid,
        createdByEmail: auth.email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
}
