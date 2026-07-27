import { NextRequest, NextResponse } from 'next/server';
import { differenceInCalendarDays, format, startOfMonth, subMonths } from 'date-fns';
import { getAdminAuth, getAdminDb } from '@/firebase/admin';
import { estimateMonthlyRevenue, type ModuleName } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';

interface SchoolDoc {
    name?: string;
    status?: string;
    createdAt?: FirebaseFirestore.Timestamp | string;
    subscription?: {
        plan?: string;
        status?: string;
        endDate?: string;
        activeModules?: ModuleName[];
    };
}

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
        console.error('[Admin KPIs] verifyIdToken failed', err);
        return { error: 'Invalid token', status: 401 };
    }
    const userSnap = await getAdminDb().collection('users').doc(decoded.uid).get();
    const profile = userSnap.data()?.profile;
    if (!profile?.isAdmin) {
        return { error: 'Admin access required', status: 403 };
    }
    return { uid: decoded.uid };
}

function toDate(value: FirebaseFirestore.Timestamp | string | undefined | null): Date | null {
    if (!value) return null;
    if (typeof value === 'string') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof (value as FirebaseFirestore.Timestamp).toDate === 'function') {
        return (value as FirebaseFirestore.Timestamp).toDate();
    }
    return null;
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = getAdminDb();
    const now = new Date();

    const schoolsSnap = await db.collection('ecoles').get();
    const schools = schoolsSnap.docs
        .map(doc => ({ id: doc.id, data: doc.data() as SchoolDoc }))
        .filter(s => s.data.status !== 'deleted');

    // Répartition par statut d'abonnement.
    const statusCounts: Record<string, number> = {};
    for (const s of schools) {
        const status = s.data.subscription?.status ?? 'none';
        statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }
    const active = statusCounts['active'] ?? 0;
    const trialing = statusCounts['trialing'] ?? 0;
    const pastDue = statusCounts['past_due'] ?? 0;
    const expired = statusCounts['expired'] ?? 0;
    const canceled = statusCounts['canceled'] ?? 0;

    // Conversion : parmi les écoles sorties de l'essai, part de celles qui payent.
    const finishedTrial = active + pastDue + expired + canceled;
    const conversionRate = finishedTrial > 0 ? Math.round((active / finishedTrial) * 100) : null;

    // MRR estimé : uniquement les écoles actives, tarification par élève.
    const activeSchools = schools.filter(s => s.data.subscription?.status === 'active');
    const mrrByPlan: Record<string, { schools: number; students: number; mrr: number }> = {};
    let mrrTotal = 0;

    const CHUNK_SIZE = 10;
    for (let i = 0; i < activeSchools.length; i += CHUNK_SIZE) {
        const chunk = activeSchools.slice(i, i + CHUNK_SIZE);
        const counts = await Promise.all(chunk.map(async s => {
            try {
                const agg = await db.collection(`ecoles/${s.id}/eleves`).count().get();
                return agg.data().count;
            } catch {
                return 0;
            }
        }));
        chunk.forEach((s, idx) => {
            const plan = s.data.subscription?.plan ?? 'Essentiel';
            const students = counts[idx];
            const mrr = estimateMonthlyRevenue(plan, students, s.data.subscription?.activeModules ?? []);
            const bucket = mrrByPlan[plan] ?? { schools: 0, students: 0, mrr: 0 };
            bucket.schools += 1;
            bucket.students += students;
            bucket.mrr += mrr;
            mrrByPlan[plan] = bucket;
            mrrTotal += mrr;
        });
    }

    // Inscriptions par mois sur les 12 derniers mois.
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        months.push({ key: format(monthStart, 'yyyy-MM'), label: format(monthStart, 'yyyy-MM'), count: 0 });
    }
    const monthIndex = new Map(months.map((m, idx) => [m.key, idx]));
    for (const s of schools) {
        const created = toDate(s.data.createdAt);
        if (!created) continue;
        const key = format(startOfMonth(created), 'yyyy-MM');
        const idx = monthIndex.get(key);
        if (idx !== undefined) months[idx].count += 1;
    }

    // Échéances proches et pertes récentes.
    let expiring30 = 0;
    let lost90 = 0;
    for (const s of schools) {
        const sub = s.data.subscription;
        if (!sub?.endDate) continue;
        const end = new Date(sub.endDate);
        if (Number.isNaN(end.getTime())) continue;
        const daysLeft = differenceInCalendarDays(end, now);
        if (sub.status === 'active' && daysLeft >= 0 && daysLeft <= 30) expiring30 += 1;
        if ((sub.status === 'expired' || sub.status === 'canceled') && daysLeft < 0 && daysLeft >= -90) lost90 += 1;
    }

    return NextResponse.json({
        generatedAt: now.toISOString(),
        totals: {
            schools: schools.length,
            active,
            trialing,
            pastDue,
            expired,
            canceled,
        },
        conversionRate,
        mrr: {
            total: mrrTotal,
            byPlan: mrrByPlan,
        },
        signupsByMonth: months,
        expiring30,
        lost90,
    });
}
