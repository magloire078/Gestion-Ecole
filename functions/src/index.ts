/**
 * Scheduled Cloud Functions for GèreEcole subscription lifecycle.
 *
 * - subscriptionLifecycle: runs daily, sends D-7 and D-3 renewal reminders
 *   and flips expired subscriptions to status='expired'.
 *
 * The reminders/expiration are tracked inside each school document so the
 * same notice is not sent twice on the same day even if the schedule fires
 * multiple times.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

if (getApps().length === 0) {
    initializeApp();
}

const db = getFirestore();

type ReminderKey = 'd7' | 'd3' | 'd1' | 'expired';

interface SubscriptionShape {
    plan?: string;
    status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
    endDate?: string;
    remindersSent?: Partial<Record<ReminderKey, string>>;
}

interface SchoolShape {
    name?: string;
    directorEmail?: string;
    subscription?: SubscriptionShape;
}

function todayKey(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

function pickReminderBucket(daysLeft: number): ReminderKey | null {
    if (daysLeft < 0) return 'expired';
    if (daysLeft === 1) return 'd1';
    if (daysLeft === 3) return 'd3';
    if (daysLeft === 7) return 'd7';
    return null;
}

function renderEmail(school: SchoolShape, daysLeft: number, endDate: Date): { subject: string; html: string } {
    const planName = school.subscription?.plan ?? 'votre plan';
    const schoolName = school.name ?? 'votre établissement';
    const dateLabel = format(endDate, 'd MMMM yyyy', { locale: fr });

    if (daysLeft < 0) {
        return {
            subject: `Abonnement expiré - ${schoolName}`,
            html: baseTemplate(
                'Abonnement expiré',
                `<p>L'abonnement <strong>${planName}</strong> pour <strong>${schoolName}</strong> est arrivé à expiration le <strong>${dateLabel}</strong>.</p>
                 <p>Pour continuer à utiliser GèreEcole sans interruption, renouvelez dès maintenant depuis votre tableau de bord.</p>`,
                'Renouveler l\'abonnement',
            ),
        };
    }

    const label = daysLeft === 1 ? 'demain' : `dans ${daysLeft} jours`;
    return {
        subject: `Renouvellement à venir (${label}) - ${schoolName}`,
        html: baseTemplate(
            `Renouvellement prévu ${label}`,
            `<p>Votre abonnement <strong>${planName}</strong> pour <strong>${schoolName}</strong> arrive à échéance le <strong>${dateLabel}</strong>.</p>
             <p>Pour éviter toute interruption, renouvelez maintenant en quelques clics depuis votre tableau de bord.</p>`,
            'Renouveler maintenant',
        ),
    };
}

function baseTemplate(title: string, bodyHtml: string, cta: string): string {
    return `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0C365A; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">GèreEcole</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #0C365A;">${title}</h2>
                ${bodyHtml}
                <div style="margin: 30px 0; text-align: center;">
                    <a href="https://gereecole.com/dashboard/parametres/abonnement" style="background-color: #2D9CDB; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">${cta}</a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 0.8em; color: #777; text-align: center;">L'équipe GèreEcole</p>
            </div>
        </div>
    `;
}

async function findDirectorUids(schoolId: string): Promise<string[]> {
    const snap = await db.collection('users')
        .where(`schools.${schoolId}`, 'in', ['directeur', 'admin'])
        .get();
    return snap.docs.map(d => d.id);
}

async function sendNotice(
    schoolId: string,
    school: SchoolShape,
    bucket: ReminderKey,
    daysLeft: number,
    endDate: Date,
): Promise<void> {
    const { subject, html } = renderEmail(school, daysLeft, endDate);

    if (school.directorEmail) {
        await db.collection('mail').add({
            to: school.directorEmail,
            message: { subject, html },
            delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
        });
    }

    const directorIds = await findDirectorUids(schoolId);
    const notifTitle = bucket === 'expired'
        ? 'Abonnement expiré'
        : `Renouvellement dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;
    const notifContent = bucket === 'expired'
        ? `L'abonnement de ${school.name ?? 'votre école'} a expiré. Renouvelez pour réactiver l'accès.`
        : `L'abonnement de ${school.name ?? 'votre école'} expire le ${format(endDate, 'd MMM yyyy', { locale: fr })}.`;

    for (const uid of directorIds) {
        await db.collection(`ecoles/${schoolId}/notifications`).add({
            userId: uid,
            title: notifTitle,
            content: notifContent,
            href: '/dashboard/parametres/abonnement',
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
        });
    }
}

export const subscriptionLifecycle = onSchedule(
    {
        schedule: 'every day 06:00',
        timeZone: 'Africa/Abidjan',
        timeoutSeconds: 540,
        memory: '512MiB',
    },
    async () => {
        const now = new Date();
        const today = todayKey();
        logger.info('[subscriptionLifecycle] Lancement', { today });

        const schoolsSnap = await db.collection('ecoles').get();
        let processed = 0;
        let remindersSent = 0;
        let expired = 0;

        for (const doc of schoolsSnap.docs) {
            const school = doc.data() as SchoolShape;
            const sub = school.subscription;
            if (!sub?.endDate) continue;

            const endDate = new Date(sub.endDate);
            if (Number.isNaN(endDate.getTime())) {
                logger.warn(`[subscriptionLifecycle] endDate invalide pour ${doc.id}`, { endDate: sub.endDate });
                continue;
            }

            const daysLeft = differenceInCalendarDays(endDate, now);
            const bucket = pickReminderBucket(daysLeft);
            if (!bucket) continue;

            const remindersSentMap = sub.remindersSent ?? {};
            if (remindersSentMap[bucket] === today) continue; // déjà envoyé aujourd'hui

            try {
                await sendNotice(doc.id, school, bucket, daysLeft, endDate);

                const update: Record<string, unknown> = {
                    [`subscription.remindersSent.${bucket}`]: today,
                    updatedAt: FieldValue.serverTimestamp(),
                };
                if (bucket === 'expired' && sub.status !== 'expired') {
                    update['subscription.status'] = 'expired';
                    expired += 1;
                }
                await doc.ref.update(update);

                remindersSent += 1;
            } catch (err) {
                logger.error(`[subscriptionLifecycle] Erreur pour ${doc.id}`, err);
            }

            processed += 1;
        }

        logger.info('[subscriptionLifecycle] Terminé', {
            scanned: schoolsSnap.size,
            processed,
            remindersSent,
            expired,
        });
    },
);

// Export pour les tests (non utilisé par Firebase).
export const __internals = { pickReminderBucket, todayKey };
// Suppress unused warnings for Timestamp import (kept for downstream typing).
export type _Timestamp = Timestamp;
