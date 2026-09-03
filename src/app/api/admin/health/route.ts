import { NextRequest, NextResponse } from 'next/server';
import { differenceInCalendarDays } from 'date-fns';
import { getAdminDb } from '@/firebase/admin';
import { requireSuperAdmin as requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

interface SchoolSubscription {
    plan?: string;
    status?: string;
    endDate?: string;
    activeModules?: string[];
}

interface SchoolDoc {
    name?: string;
    status?: string;
    directorEmail?: string;
    directorPhone?: string;
    isSetupComplete?: boolean;
    createdAt?: FirebaseFirestore.Timestamp | string;
    updatedAt?: FirebaseFirestore.Timestamp | string;
    subscription?: SchoolSubscription;
}

export interface SchoolHealthRow {
    id: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    daysLeft: number | null;
    students: number;
    classes: number;
    staff: number;
    isSetupComplete: boolean;
    lastActivityDays: number | null;
    lastPaymentDays: number | null;
    score: number;
    breakdown: {
        setup: number;
        adoption: number;
        activity: number;
        subscription: number;
    };
    risk: 'at_risk' | 'watch' | 'healthy';
    directorEmail: string | null;
    directorPhone: string | null;
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

function daysSince(date: Date | null, now: Date): number | null {
    if (!date) return null;
    return Math.max(0, differenceInCalendarDays(now, date));
}

function scoreSetup(isSetupComplete: boolean, classes: number): number {
    let score = 0;
    if (isSetupComplete) score += 10;
    if (classes > 0) score += 10;
    return score;
}

function scoreAdoption(students: number, staff: number): number {
    let score = 0;
    if (students >= 100) score += 25;
    else if (students >= 20) score += 18;
    else if (students >= 1) score += 8;
    if (staff >= 1) score += 5;
    return score;
}

function scoreActivity(lastActivityDays: number | null, lastPaymentDays: number | null): number {
    let score = 0;
    if (lastActivityDays !== null) {
        if (lastActivityDays <= 7) score += 20;
        else if (lastActivityDays <= 30) score += 12;
        else if (lastActivityDays <= 90) score += 5;
    }
    if (lastPaymentDays !== null) {
        if (lastPaymentDays <= 30) score += 10;
        else if (lastPaymentDays <= 90) score += 5;
    }
    return score;
}

function scoreSubscription(status: string | undefined, daysLeft: number | null): number {
    switch (status) {
        case 'active':
            if (daysLeft === null) return 14;
            if (daysLeft > 14) return 20;
            if (daysLeft >= 0) return 12;
            return 4;
        case 'trialing':
            return 10;
        case 'past_due':
            return 4;
        default:
            return 0;
    }
}

async function latestTimestamp(
    db: FirebaseFirestore.Firestore,
    path: string,
): Promise<Date | null> {
    try {
        const snap = await db.collection(path).orderBy('createdAt', 'desc').limit(1).get();
        if (snap.empty) return null;
        return toDate(snap.docs[0].data().createdAt);
    } catch {
        return null;
    }
}

async function countCollection(
    db: FirebaseFirestore.Firestore,
    path: string,
): Promise<number> {
    try {
        const agg = await db.collection(path).count().get();
        return agg.data().count;
    } catch {
        return 0;
    }
}

async function buildRow(
    db: FirebaseFirestore.Firestore,
    id: string,
    school: SchoolDoc,
    now: Date,
): Promise<SchoolHealthRow> {
    const [students, classes, staff, lastPayment, lastNotification] = await Promise.all([
        countCollection(db, `ecoles/${id}/eleves`),
        countCollection(db, `ecoles/${id}/classes`),
        countCollection(db, `ecoles/${id}/personnel`),
        latestTimestamp(db, `ecoles/${id}/comptabilite`),
        latestTimestamp(db, `ecoles/${id}/notifications`),
    ]);

    const sub = school.subscription;
    const endDate = sub?.endDate ? new Date(sub.endDate) : null;
    const daysLeft = endDate && !Number.isNaN(endDate.getTime())
        ? differenceInCalendarDays(endDate, now)
        : null;

    const activityCandidates = [lastNotification, lastPayment, toDate(school.updatedAt)]
        .filter((d): d is Date => d !== null);
    const lastActivity = activityCandidates.length
        ? new Date(Math.max(...activityCandidates.map(d => d.getTime())))
        : null;

    const lastActivityDays = daysSince(lastActivity, now);
    const lastPaymentDays = daysSince(lastPayment, now);

    const breakdown = {
        setup: scoreSetup(!!school.isSetupComplete, classes),
        adoption: scoreAdoption(students, staff),
        activity: scoreActivity(lastActivityDays, lastPaymentDays),
        subscription: scoreSubscription(sub?.status, daysLeft),
    };
    const score = breakdown.setup + breakdown.adoption + breakdown.activity + breakdown.subscription;

    return {
        id,
        name: school.name ?? '—',
        plan: sub?.plan ?? '—',
        subscriptionStatus: sub?.status ?? '—',
        daysLeft,
        students,
        classes,
        staff,
        isSetupComplete: !!school.isSetupComplete,
        lastActivityDays,
        lastPaymentDays,
        score,
        breakdown,
        risk: score >= 70 ? 'healthy' : score >= 45 ? 'watch' : 'at_risk',
        directorEmail: school.directorEmail ?? null,
        directorPhone: school.directorPhone ?? null,
    };
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = getAdminDb();
    const now = new Date();

    const schoolsSnap = await db.collection('ecoles').get();
    const activeSchools = schoolsSnap.docs.filter(doc => {
        const data = doc.data() as SchoolDoc;
        return data.status !== 'deleted';
    });

    const rows: SchoolHealthRow[] = [];
    const CHUNK_SIZE = 10;
    for (let i = 0; i < activeSchools.length; i += CHUNK_SIZE) {
        const chunk = activeSchools.slice(i, i + CHUNK_SIZE);
        const chunkRows = await Promise.all(
            chunk.map(doc => buildRow(db, doc.id, doc.data() as SchoolDoc, now)),
        );
        rows.push(...chunkRows);
    }

    rows.sort((a, b) => a.score - b.score);

    return NextResponse.json({ generatedAt: now.toISOString(), rows });
}
