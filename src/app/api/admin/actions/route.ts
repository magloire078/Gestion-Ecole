import { NextRequest, NextResponse } from 'next/server';
import { addDays, format } from 'date-fns';
import { getAdminDb } from '@/firebase/admin';
import { requireSuperAdmin as requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export interface PlannedAction {
    source: 'client' | 'prospect';
    id: string;
    name: string;
    date: string;
    note: string | null;
    contact: { phone: string | null; email: string | null };
    overdue: boolean;
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = getAdminDb();
    const today = format(new Date(), 'yyyy-MM-dd');
    const horizon = format(addDays(new Date(), 7), 'yyyy-MM-dd');

    // Prochaines actions notées sur les clients (documents résumé du journal CRM).
    const clientsSnap = await db.collection('crm_interactions')
        .where('nextActionDate', '<=', horizon)
        .orderBy('nextActionDate')
        .limit(200)
        .get();

    // Prochaines actions du pipeline prospects.
    const prospectsSnap = await db.collection('crm_prospects')
        .where('nextActionDate', '<=', horizon)
        .orderBy('nextActionDate')
        .limit(200)
        .get();

    const actions: PlannedAction[] = [];

    for (const doc of clientsSnap.docs) {
        const data = doc.data();
        if (!data.nextActionDate) continue;
        // Le doc résumé porte l'id de l'école : on va chercher les coordonnées.
        let phone: string | null = null;
        let email: string | null = null;
        let name: string = data.schoolName ?? doc.id;
        try {
            const schoolSnap = await db.collection('ecoles').doc(doc.id).get();
            if (schoolSnap.exists) {
                const school = schoolSnap.data() as { name?: string; directorPhone?: string; directorEmail?: string };
                name = school.name ?? name;
                phone = school.directorPhone ?? null;
                email = school.directorEmail ?? null;
            }
        } catch {
            // coordonnées indisponibles : l'action reste listée
        }
        actions.push({
            source: 'client',
            id: doc.id,
            name,
            date: data.nextActionDate,
            note: data.nextActionNote ?? null,
            contact: { phone, email },
            overdue: data.nextActionDate < today,
        });
    }

    for (const doc of prospectsSnap.docs) {
        const data = doc.data();
        if (!data.nextActionDate) continue;
        actions.push({
            source: 'prospect',
            id: doc.id,
            name: data.schoolName ?? doc.id,
            date: data.nextActionDate,
            note: data.notes ?? null,
            contact: { phone: data.phone ?? null, email: data.email ?? null },
            overdue: data.nextActionDate < today,
        });
    }

    actions.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ generatedAt: new Date().toISOString(), today, actions });
}
