import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireSuperAdminOrCommercial as requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const STAGES = ['contacte', 'demo', 'essai', 'converti', 'perdu'] as const;

export async function PATCH(
    request: NextRequest,
    { params }: { params: { prospectId: string } },
) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ref = getAdminDb().collection('crm_prospects').doc(params.prospectId);
    const snap = await ref.get();
    if (!snap.exists) {
        return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    const str = (v: any, max = 500) =>
        typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

    if ('stage' in body) {
        if (!STAGES.includes(body.stage)) {
            return NextResponse.json({ error: `stage must be one of: ${STAGES.join(', ')}` }, { status: 400 });
        }
        update.stage = body.stage;
    }
    if ('schoolName' in body) {
        const name = str(body.schoolName, 200);
        if (!name) return NextResponse.json({ error: 'schoolName cannot be empty' }, { status: 400 });
        update.schoolName = name;
    }
    if ('contactName' in body) update.contactName = str(body.contactName, 200);
    if ('phone' in body) update.phone = str(body.phone, 40);
    if ('email' in body) update.email = str(body.email, 200);
    if ('city' in body) update.city = str(body.city, 120);
    if ('notes' in body) update.notes = str(body.notes, 5000);
    if ('nextActionDate' in body) {
        const date = str(body.nextActionDate, 10);
        if (date && Number.isNaN(new Date(date).getTime())) {
            return NextResponse.json({ error: 'nextActionDate must be a valid date (YYYY-MM-DD)' }, { status: 400 });
        }
        update.nextActionDate = date;
    }

    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    update.updatedAt = FieldValue.serverTimestamp();
    update.updatedBy = auth.uid;
    await ref.update(update);

    return NextResponse.json({ ok: true });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { prospectId: string } },
) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ref = getAdminDb().collection('crm_prospects').doc(params.prospectId);
    const snap = await ref.get();
    if (!snap.exists) {
        return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
}
