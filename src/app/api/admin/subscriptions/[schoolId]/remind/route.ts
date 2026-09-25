import { NextRequest, NextResponse } from 'next/server';
import { differenceInCalendarDays, format } from 'date-fns';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { renderReminderEmail } from '@/lib/subscription-reminder-template';
import { requireSuperAdmin as requireAdmin } from '@/lib/admin-auth';

interface SchoolSubscription {
    plan?: string;
    status?: string;
    endDate?: string;
    remindersSent?: Record<string, string>;
}

interface SchoolDoc {
    name?: string;
    directorEmail?: string;
    subscription?: SchoolSubscription;
}


export async function POST(
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

    const today = format(new Date(), 'yyyy-MM-dd');
    const schoolRef = getAdminDb().collection('ecoles').doc(schoolId);
    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    const school = schoolSnap.data() as SchoolDoc;
    const sub = school.subscription;
    if (!sub?.endDate) {
        return NextResponse.json({ error: 'School has no subscription endDate' }, { status: 400 });
    }

    const lastManual = sub.remindersSent?.manual;
    if (lastManual === today) {
        return NextResponse.json({
            error: 'Un rappel manuel a déjà été envoyé aujourd\'hui pour cette école.',
        }, { status: 429 });
    }

    const endDate = new Date(sub.endDate);
    const daysLeft = differenceInCalendarDays(endDate, new Date());

    const rendered = renderReminderEmail({
        schoolName: school.name ?? 'votre établissement',
        planName: sub.plan ?? 'votre plan',
        endDate,
        daysLeft,
    });

    if (school.directorEmail) {
        await getAdminDb().collection('mail').add({
            to: school.directorEmail,
            message: { subject: rendered.subject, html: rendered.html },
            delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
        });
    }

    const directorsSnap = await getAdminDb().collection('users')
        .where(`schools.${schoolId}`, 'in', ['directeur', 'admin'])
        .get();

    const notifPayload = {
        title: rendered.title,
        content: `Rappel manuel envoyé par un super-admin. ${rendered.body.replace(/<[^>]+>/g, '')}`,
        href: '/dashboard/parametres/abonnement',
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
    };
    for (const doc of directorsSnap.docs) {
        await getAdminDb()
            .collection(`ecoles/${schoolId}/notifications`)
            .add({ ...notifPayload, userId: doc.id });
    }

    await schoolRef.update({
        'subscription.remindersSent.manual': today,
        updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
        ok: true,
        sentTo: school.directorEmail ?? null,
        directorsNotified: directorsSnap.size,
        daysLeft,
    });
}
