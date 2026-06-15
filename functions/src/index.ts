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
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

if (getApps().length === 0) {
    initializeApp();
}

const db = getFirestore();

type ReminderKey = 'd7' | 'd3' | 'd1' | 'past_due' | 'expired';

const PAST_DUE_GRACE_DAYS = 7;

interface SubscriptionShape {
    plan?: string;
    status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
    endDate?: string;
    pastDueSince?: string;
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

/**
 * Détermine le rappel à envoyer en fonction du nombre de jours restants
 * et du statut courant. La transition active/trialing -> past_due se
 * déclenche le premier jour après l'échéance. Après PAST_DUE_GRACE_DAYS,
 * le statut bascule en expired.
 */
function pickReminderBucket(
    daysLeft: number,
    status?: SubscriptionShape['status'],
    pastDueSince?: string,
): ReminderKey | null {
    if (status === 'past_due') {
        const since = pastDueSince ? new Date(pastDueSince) : null;
        if (since && !Number.isNaN(since.getTime())) {
            const inGrace = differenceInCalendarDays(new Date(), since);
            if (inGrace >= PAST_DUE_GRACE_DAYS) return 'expired';
        } else if (daysLeft <= -PAST_DUE_GRACE_DAYS) {
            return 'expired';
        }
        return null; // déjà notifié en past_due, on attend la fin de la grâce
    }
    if (daysLeft < 0) {
        // active/trialing arrivant à échéance => grâce past_due
        return 'past_due';
    }
    if (daysLeft === 1) return 'd1';
    if (daysLeft === 3) return 'd3';
    if (daysLeft === 7) return 'd7';
    return null;
}

function renderEmail(school: SchoolShape, daysLeft: number, endDate: Date, bucket: ReminderKey): { subject: string; html: string } {
    const planName = school.subscription?.plan ?? 'votre plan';
    const schoolName = school.name ?? 'votre établissement';
    const dateLabel = format(endDate, 'd MMMM yyyy', { locale: fr });

    if (bucket === 'expired') {
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

    if (bucket === 'past_due') {
        return {
            subject: `Paiement en attente - ${schoolName}`,
            html: baseTemplate(
                'Paiement en attente — période de grâce',
                `<p>L'échéance de votre abonnement <strong>${planName}</strong> pour <strong>${schoolName}</strong> est dépassée (${dateLabel}).</p>
                 <p>Vous bénéficiez d'une période de grâce de <strong>${PAST_DUE_GRACE_DAYS} jours</strong> pour régulariser votre paiement avant la suspension de l'accès.</p>`,
                'Régulariser le paiement',
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
    const { subject, html } = renderEmail(school, daysLeft, endDate, bucket);

    if (school.directorEmail) {
        await db.collection('mail').add({
            to: school.directorEmail,
            message: { subject, html },
            delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
        });
    }

    const directorIds = await findDirectorUids(schoolId);
    let notifTitle: string;
    let notifContent: string;
    if (bucket === 'expired') {
        notifTitle = 'Abonnement expiré';
        notifContent = `L'abonnement de ${school.name ?? 'votre école'} a expiré. Renouvelez pour réactiver l'accès.`;
    } else if (bucket === 'past_due') {
        notifTitle = 'Paiement en attente';
        notifContent = `L'échéance de ${school.name ?? 'votre école'} est dépassée. ${PAST_DUE_GRACE_DAYS} jours pour régulariser.`;
    } else {
        notifTitle = `Renouvellement dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;
        notifContent = `L'abonnement de ${school.name ?? 'votre école'} expire le ${format(endDate, 'd MMM yyyy', { locale: fr })}.`;
    }

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
        let pastDue = 0;
        const bucketStats: Record<string, number> = {};

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
            const bucket = pickReminderBucket(daysLeft, sub.status, sub.pastDueSince);
            if (!bucket) continue;

            bucketStats[bucket] = (bucketStats[bucket] ?? 0) + 1;
            if (bucket === 'd1') {
                logger.info(`[subscriptionLifecycle] J-1 déclenché pour ${doc.id}`, { schoolName: school.name });
            }

            const remindersSentMap = sub.remindersSent ?? {};
            if (remindersSentMap[bucket] === today) continue; // déjà envoyé aujourd'hui

            try {
                await sendNotice(doc.id, school, bucket, daysLeft, endDate);

                const update: Record<string, unknown> = {
                    [`subscription.remindersSent.${bucket}`]: today,
                    updatedAt: FieldValue.serverTimestamp(),
                };
                if (bucket === 'past_due' && sub.status !== 'past_due') {
                    update['subscription.status'] = 'past_due';
                    update['subscription.pastDueSince'] = now.toISOString();
                    pastDue += 1;
                }
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
            pastDue,
            expired,
            bucketStats,
        });
    },
);

/* =========================================================================
 * Messagerie 1-1 super-admin <-> directeur — notifications & relance email
 * ========================================================================= */

interface ConversationMessage {
    senderId: string;
    senderName?: string;
    senderRole: 'admin' | 'director';
    text: string;
}

async function findSuperAdminUids(): Promise<string[]> {
    const snap = await db.collection('users').where('isSuperAdmin', '==', true).get();
    return snap.docs.map(d => d.id);
}

/**
 * Quand un message arrive dans school_conversations/{schoolId}/messages,
 * dépose une notification in-app à l'autre rôle.
 *
 * - Message du directeur -> notifications aux super-admins (collection
 *   `notifications` racine, `userId` = uid super-admin).
 * - Message de l'admin -> notification dans
 *   `ecoles/{schoolId}/notifications` pour les directeurs/admins école.
 */
export const onConversationMessageCreated = onDocumentCreated(
    'school_conversations/{schoolId}/messages/{messageId}',
    async event => {
        const snap = event.data;
        if (!snap) return;
        const message = snap.data() as ConversationMessage;
        const { schoolId } = event.params as { schoolId: string };

        const schoolSnap = await db.doc(`ecoles/${schoolId}`).get();
        const schoolName = (schoolSnap.data() as SchoolShape | undefined)?.name ?? 'votre école';

        try {
            if (message.senderRole === 'director') {
                const adminUids = await findSuperAdminUids();
                await Promise.all(adminUids.map(uid => db.collection('notifications').add({
                    userId: uid,
                    title: `Message de ${schoolName}`,
                    content: message.text.slice(0, 140),
                    href: '/admin/system/messages',
                    isRead: false,
                    createdAt: FieldValue.serverTimestamp(),
                })));
            } else {
                const directorIds = await findDirectorUids(schoolId);
                await Promise.all(directorIds.map(uid => db.collection(`ecoles/${schoolId}/notifications`).add({
                    userId: uid,
                    title: 'Nouveau message - équipe GèreEcole',
                    content: message.text.slice(0, 140),
                    href: '/dashboard/support/messages',
                    isRead: false,
                    createdAt: FieldValue.serverTimestamp(),
                })));
            }

            // Marque le message comme nécessitant un email de relance si
            // jamais lu sous 24h (consommé par dispatchUnreadConversationEmails).
            await db.doc(`school_conversations/${schoolId}`).set({
                lastMessageAt: FieldValue.serverTimestamp(),
                lastMessageRole: message.senderRole,
                emailRelanceSent: false,
            }, { merge: true });
        } catch (err) {
            logger.error('[onConversationMessageCreated] erreur', { schoolId, err });
        }
    },
);

/**
 * Toutes les heures, parcourt les conversations où il reste des messages
 * non lus depuis plus de 24h et envoie un email de relance au rôle inactif.
 * Un seul email par cycle "nouveau message", tracé par `emailRelanceSent`.
 */
export const dispatchUnreadConversationEmails = onSchedule(
    {
        schedule: 'every 60 minutes',
        timeZone: 'Africa/Abidjan',
        timeoutSeconds: 300,
    },
    async () => {
        const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
        const snap = await db.collection('school_conversations')
            .where('emailRelanceSent', '==', false)
            .where('lastMessageAt', '<=', cutoff)
            .get();

        let sent = 0;
        for (const doc of snap.docs) {
            const data = doc.data() as {
                schoolName?: string;
                lastMessageRole?: 'admin' | 'director';
                unreadByAdmin?: number;
                unreadByDirector?: number;
            };
            const schoolId = doc.id;

            try {
                if (data.lastMessageRole === 'admin' && (data.unreadByDirector ?? 0) > 0) {
                    const schoolSnap = await db.doc(`ecoles/${schoolId}`).get();
                    const school = schoolSnap.data() as SchoolShape | undefined;
                    if (school?.directorEmail) {
                        await db.collection('mail').add({
                            to: school.directorEmail,
                            message: {
                                subject: `Nouveau message de l'équipe GèreEcole`,
                                html: baseTemplate(
                                    'Vous avez un message non lu',
                                    `<p>L'équipe GèreEcole vous a envoyé un message il y a plus de 24h sur la messagerie support de <strong>${school.name ?? 'votre école'}</strong>.</p>
                                     <p>Connectez-vous pour le consulter.</p>`,
                                    'Ouvrir la messagerie',
                                ).replace('/dashboard/parametres/abonnement', '/dashboard/support/messages'),
                            },
                            delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
                        });
                        sent += 1;
                    }
                } else if (data.lastMessageRole === 'director' && (data.unreadByAdmin ?? 0) > 0) {
                    const adminSnap = await db.collection('users').where('isSuperAdmin', '==', true).get();
                    const emails = adminSnap.docs.map(d => (d.data() as { email?: string }).email).filter(Boolean) as string[];
                    if (emails.length > 0) {
                        await db.collection('mail').add({
                            to: emails,
                            message: {
                                subject: `Message non lu d'un directeur (${data.schoolName ?? schoolId})`,
                                html: baseTemplate(
                                    'Message en attente',
                                    `<p>Un directeur a envoyé un message il y a plus de 24h, sans réponse.</p>
                                     <p><strong>École :</strong> ${data.schoolName ?? schoolId}</p>`,
                                    'Ouvrir la messagerie admin',
                                ).replace('/dashboard/parametres/abonnement', '/admin/system/messages'),
                            },
                            delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
                        });
                        sent += 1;
                    }
                }

                await doc.ref.update({ emailRelanceSent: true });
            } catch (err) {
                logger.error('[dispatchUnreadConversationEmails] erreur', { schoolId, err });
            }
        }

        logger.info('[dispatchUnreadConversationEmails] terminé', { scanned: snap.size, sent });
    },
);

// Export pour les tests (non utilisé par Firebase).
export const __internals = { pickReminderBucket, todayKey, PAST_DUE_GRACE_DAYS };
// Suppress unused warnings for Timestamp import (kept for downstream typing).
export type _Timestamp = Timestamp;
