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
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
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

type NurtureKey = 'trial_j1' | 'trial_j7' | 'winback_j15' | 'winback_j45';

interface SubscriptionShape {
    plan?: string;
    status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
    startDate?: string;
    endDate?: string;
    pastDueSince?: string;
    remindersSent?: Partial<Record<ReminderKey, string>>;
    nurtureSent?: Partial<Record<NurtureKey, string>>;
}

interface SchoolShape {
    name?: string;
    status?: string;
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
 * Alertes admin — nouvelle inscription & nouvel abonnement
 * =========================================================================
 * Notifie les super-admins par email (collection `mail`) et par WhatsApp
 * (Evolution API, même configuration que le chat support :
 * EVOLUTION_API_URL, EVOLUTION_API_KEY, WhatsApp_INSTANCE_NAME,
 * WhatsApp_GROUP_ID). Si la configuration WhatsApp est absente, seule
 * l'alerte email part.
 */

async function sendAdminWhatsApp(text: string): Promise<boolean> {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.WhatsApp_INSTANCE_NAME;
    const groupId = process.env.WhatsApp_GROUP_ID;

    if (!apiUrl || !apiKey || !instance || !groupId || apiUrl.includes('votre-serveur.com')) {
        logger.warn('[adminAlerts] WhatsApp non configuré, alerte email uniquement');
        return false;
    }

    try {
        const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: apiKey },
            body: JSON.stringify({
                number: groupId,
                options: { delay: 1200, presence: 'composing', linkPreview: false },
                textMessage: { text },
            }),
        });
        if (!response.ok) {
            const result = await response.text();
            logger.error('[adminAlerts] Evolution API error', { result });
            return false;
        }
        return true;
    } catch (err) {
        logger.error('[adminAlerts] envoi WhatsApp échoué', err);
        return false;
    }
}

async function sendAdminAlert(subject: string, htmlBody: string, whatsappText: string): Promise<void> {
    const adminsSnap = await db.collection('users').where('isSuperAdmin', '==', true).get();
    const emails = adminsSnap.docs
        .map(d => (d.data() as { email?: string }).email)
        .filter(Boolean) as string[];

    if (emails.length > 0) {
        await db.collection('mail').add({
            to: emails,
            message: {
                subject,
                html: baseTemplate(subject, htmlBody, 'Ouvrir l\'admin système')
                    .replace('/dashboard/parametres/abonnement', '/admin/system/dashboard'),
            },
            delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
            adminAlert: true,
        });
    }

    await sendAdminWhatsApp(whatsappText);

    // Notification in-app pour les super-admins (cloche de l'admin système).
    await Promise.all(adminsSnap.docs.map(d => db.collection('notifications').add({
        userId: d.id,
        title: subject,
        content: whatsappText.replace(/\*/g, '').slice(0, 180),
        href: '/admin/system/dashboard',
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
    })));
}

interface NewSchoolShape extends SchoolShape {
    directorFirstName?: string;
    directorLastName?: string;
    directorPhone?: string;
    country?: string;
    region?: string;
    address?: string;
}

/** Alerte à la création d'une école (nouvelle inscription sur la plateforme). */
export const onSchoolRegistered = onDocumentCreated('ecoles/{schoolId}', async event => {
    const snap = event.data;
    if (!snap) return;
    const school = snap.data() as NewSchoolShape;
    const schoolName = school.name ?? event.params.schoolId;
    const director = `${school.directorFirstName ?? ''} ${school.directorLastName ?? ''}`.trim() || '—';
    const plan = school.subscription?.plan ?? '—';
    const status = school.subscription?.status ?? '—';
    const location = [school.region, school.country].filter(Boolean).join(', ') || '—';

    try {
        await sendAdminAlert(
            `Nouvelle inscription : ${schoolName}`,
            `<p>Une nouvelle école vient de s'inscrire sur GèreEcole :</p>
             <ul>
                <li><strong>École :</strong> ${schoolName}</li>
                <li><strong>Directeur :</strong> ${director}</li>
                <li><strong>Localisation :</strong> ${location}</li>
                <li><strong>Plan :</strong> ${plan} (${status})</li>
                <li><strong>Email :</strong> ${school.directorEmail ?? '—'}</li>
                <li><strong>Téléphone :</strong> ${school.directorPhone ?? '—'}</li>
             </ul>
             <p>Pensez à un appel de bienvenue dans les 48h : c'est le meilleur levier de conversion de l'essai.</p>`,
            `🎉 *Nouvelle inscription GèreEcole*\n\n*École :* ${schoolName}\n*Directeur :* ${director}\n*Localisation :* ${location}\n*Plan :* ${plan} (${status})\n*Tél :* ${school.directorPhone ?? '—'}`,
        );
        logger.info('[onSchoolRegistered] alerte envoyée', { schoolId: event.params.schoolId, schoolName });
    } catch (err) {
        logger.error('[onSchoolRegistered] erreur', { schoolId: event.params.schoolId, err });
    }
});

type SubscriptionEvent = 'activated' | 'plan_changed' | 'renewed';

/**
 * Détecte un événement d'abonnement notable entre deux versions du
 * document école : activation d'un abonnement payant, changement de plan,
 * ou renouvellement (échéance repoussée). Les mises à jour techniques
 * (rappels, nurturing, stats) ne déclenchent rien.
 */
function pickSubscriptionEvent(
    before: SubscriptionShape | undefined,
    after: SubscriptionShape | undefined,
): SubscriptionEvent | null {
    if (!after) return null;
    if (after.status === 'active' && before?.status !== 'active') return 'activated';
    if (after.status === 'active' && before?.plan && after.plan && before.plan !== after.plan) return 'plan_changed';
    if (
        after.status === 'active' && before?.status === 'active'
        && before.endDate && after.endDate
        && new Date(after.endDate).getTime() > new Date(before.endDate).getTime()
    ) return 'renewed';
    return null;
}

/** Alerte quand un abonnement est activé, renouvelé ou change de plan. */
export const onSubscriptionChanged = onDocumentUpdated('ecoles/{schoolId}', async event => {
    const before = event.data?.before.data() as SchoolShape | undefined;
    const after = event.data?.after.data() as SchoolShape | undefined;
    if (!after) return;

    const change = pickSubscriptionEvent(before?.subscription, after?.subscription);
    if (!change) return;

    const schoolName = after.name ?? event.params.schoolId;
    const plan = after.subscription?.plan ?? '—';
    const endDate = after.subscription?.endDate
        ? format(new Date(after.subscription.endDate), 'd MMMM yyyy', { locale: fr })
        : '—';

    const labels: Record<SubscriptionEvent, { subject: string; emoji: string; detail: string }> = {
        activated: {
            subject: `Nouvel abonnement : ${schoolName}`,
            emoji: '💰',
            detail: `L'école <strong>${schoolName}</strong> vient d'activer un abonnement <strong>${plan}</strong> (échéance : ${endDate}).`,
        },
        plan_changed: {
            subject: `Changement de plan : ${schoolName}`,
            emoji: '🔄',
            detail: `L'école <strong>${schoolName}</strong> est passée du plan <strong>${before?.subscription?.plan ?? '—'}</strong> au plan <strong>${plan}</strong>.`,
        },
        renewed: {
            subject: `Renouvellement : ${schoolName}`,
            emoji: '✅',
            detail: `L'école <strong>${schoolName}</strong> a renouvelé son abonnement <strong>${plan}</strong> (nouvelle échéance : ${endDate}).`,
        },
    };
    const label = labels[change];

    try {
        await sendAdminAlert(
            label.subject,
            `<p>${label.detail}</p>`,
            `${label.emoji} *${label.subject}*\n\n${label.detail.replace(/<[^>]+>/g, '')}`,
        );
        logger.info('[onSubscriptionChanged] alerte envoyée', { schoolId: event.params.schoolId, change });
    } catch (err) {
        logger.error('[onSubscriptionChanged] erreur', { schoolId: event.params.schoolId, change, err });
    }
});

/* =========================================================================
 * Relances cycle de vie client — onboarding essai & reconquête
 * ========================================================================= */

/**
 * Détermine la relance de nurturing à envoyer pour une école, ou null.
 *
 * - Essai (trialing) : email de bienvenue à J+1 du début d'essai, puis
 *   conseil d'activation à J+7. Chaque étape n'est envoyée que dans une
 *   fenêtre bornée pour ne pas arroser les essais antérieurs à la mise
 *   en place de la fonction.
 * - Reconquête (expired) : offre de retour à J+15 après l'échéance, puis
 *   dernière relance à J+45. Chaque étape n'est envoyée qu'une seule fois
 *   (tracée dans subscription.nurtureSent).
 */
function pickNurtureStep(
    now: Date,
    sub: SubscriptionShape | undefined,
): NurtureKey | null {
    if (!sub) return null;
    const sent = sub.nurtureSent ?? {};

    if (sub.status === 'trialing' && sub.startDate) {
        const start = new Date(sub.startDate);
        if (Number.isNaN(start.getTime())) return null;
        const days = differenceInCalendarDays(now, start);
        if (days >= 1 && days <= 3 && !sent.trial_j1) return 'trial_j1';
        if (days >= 7 && days <= 13 && !sent.trial_j7) return 'trial_j7';
        return null;
    }

    if (sub.status === 'expired' && sub.endDate) {
        const end = new Date(sub.endDate);
        if (Number.isNaN(end.getTime())) return null;
        const days = differenceInCalendarDays(now, end);
        if (days >= 15 && days <= 21 && !sent.winback_j15) return 'winback_j15';
        if (days >= 45 && days <= 52 && !sent.winback_j45) return 'winback_j45';
        return null;
    }

    return null;
}

function renderNurtureEmail(school: SchoolShape, step: NurtureKey): { subject: string; html: string; notifTitle: string; notifContent: string } {
    const schoolName = school.name ?? 'votre établissement';

    switch (step) {
        case 'trial_j1':
            return {
                subject: `Bienvenue sur GèreEcole - vos premiers pas`,
                html: baseTemplate(
                    'Bienvenue ! Configurons votre école',
                    `<p>Merci d'avoir choisi GèreEcole pour <strong>${schoolName}</strong>. Pour profiter pleinement de votre essai, voici les 3 étapes qui font la différence :</p>
                     <ol>
                        <li><strong>Créez vos classes</strong> dans le module Pédagogie.</li>
                        <li><strong>Importez vos élèves</strong> (fichier Excel accepté).</li>
                        <li><strong>Configurez les frais de scolarité</strong> pour suivre les paiements.</li>
                     </ol>
                     <p>Besoin d'aide ? Répondez simplement à cet email ou écrivez-nous depuis la messagerie support : nous pouvons faire la configuration avec vous.</p>`,
                    'Configurer mon école',
                ).replace('/dashboard/parametres/abonnement', '/dashboard'),
                notifTitle: 'Bienvenue sur GèreEcole !',
                notifContent: 'Créez vos classes, importez vos élèves et configurez les frais pour bien démarrer votre essai.',
            };
        case 'trial_j7':
            return {
                subject: `Une semaine d'essai - tirez le meilleur de GèreEcole`,
                html: baseTemplate(
                    'Déjà une semaine !',
                    `<p>Votre essai pour <strong>${schoolName}</strong> a une semaine. Avez-vous découvert :</p>
                     <ul>
                        <li>Le <strong>portail parents</strong> pour partager notes et absences ?</li>
                        <li>Les <strong>paiements en ligne</strong> (Wave, Orange Money, MTN, carte) ?</li>
                        <li>Les <strong>bulletins automatiques</strong> en fin de période ?</li>
                     </ul>
                     <p>Notre équipe peut vous faire une démonstration personnalisée : répondez à cet email pour convenir d'un créneau.</p>`,
                    'Explorer mon tableau de bord',
                ).replace('/dashboard/parametres/abonnement', '/dashboard'),
                notifTitle: 'Une semaine d\'essai !',
                notifContent: 'Portail parents, paiements en ligne, bulletins automatiques : découvrez ce qui vous attend.',
            };
        case 'winback_j15':
            return {
                subject: `${schoolName} nous manque - reprenez où vous en étiez`,
                html: baseTemplate(
                    'Vos données vous attendent',
                    `<p>L'abonnement de <strong>${schoolName}</strong> a expiré il y a deux semaines, mais toutes vos données (élèves, notes, paiements) sont <strong>conservées intactes</strong>.</p>
                     <p>Réactivez votre abonnement en quelques clics et reprenez exactement où vous en étiez. Si un point vous a freiné (prix, fonctionnalité, accompagnement), répondez à cet email : nous trouverons une solution ensemble.</p>`,
                    'Réactiver mon abonnement',
                ),
                notifTitle: 'Vos données vous attendent',
                notifContent: 'Réactivez votre abonnement pour retrouver élèves, notes et paiements, conservés intacts.',
            };
        case 'winback_j45':
            return {
                subject: `Dernière relance - vos données GèreEcole`,
                html: baseTemplate(
                    'On garde votre place',
                    `<p>Cela fait maintenant 45 jours que l'abonnement de <strong>${schoolName}</strong> a expiré.</p>
                     <p>Vos données restent sauvegardées et votre espace peut être réactivé à tout moment. Si vous avez choisi une autre solution, nous serions sincèrement intéressés de savoir ce qui a pesé dans votre décision : une simple réponse à cet email nous aiderait beaucoup.</p>`,
                    'Réactiver mon abonnement',
                ),
                notifTitle: 'Votre espace GèreEcole vous attend',
                notifContent: 'Vos données sont conservées : réactivez votre abonnement à tout moment.',
            };
    }
}

export const clientLifecycleNurture = onSchedule(
    {
        schedule: 'every day 07:00',
        timeZone: 'Africa/Abidjan',
        timeoutSeconds: 540,
        memory: '512MiB',
    },
    async () => {
        const now = new Date();
        const today = todayKey();
        logger.info('[clientLifecycleNurture] Lancement', { today });

        const schoolsSnap = await db.collection('ecoles').get();
        let sentCount = 0;
        const stepStats: Record<string, number> = {};

        for (const doc of schoolsSnap.docs) {
            const school = doc.data() as SchoolShape;
            if (school.status === 'deleted') continue;

            const step = pickNurtureStep(now, school.subscription);
            if (!step) continue;

            stepStats[step] = (stepStats[step] ?? 0) + 1;

            try {
                const rendered = renderNurtureEmail(school, step);

                if (school.directorEmail) {
                    await db.collection('mail').add({
                        to: school.directorEmail,
                        message: { subject: rendered.subject, html: rendered.html },
                        delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
                        nurtureStep: step,
                        schoolId: doc.id,
                    });
                }

                const directorIds = await findDirectorUids(doc.id);
                for (const uid of directorIds) {
                    await db.collection(`ecoles/${doc.id}/notifications`).add({
                        userId: uid,
                        title: rendered.notifTitle,
                        content: rendered.notifContent,
                        href: step.startsWith('winback') ? '/dashboard/parametres/abonnement' : '/dashboard',
                        isRead: false,
                        createdAt: FieldValue.serverTimestamp(),
                    });
                }

                await doc.ref.update({
                    [`subscription.nurtureSent.${step}`]: today,
                    updatedAt: FieldValue.serverTimestamp(),
                });
                sentCount += 1;
            } catch (err) {
                logger.error(`[clientLifecycleNurture] Erreur pour ${doc.id}`, err);
            }
        }

        logger.info('[clientLifecycleNurture] Terminé', {
            scanned: schoolsSnap.size,
            sent: sentCount,
            stepStats,
        });
    },
);

/* =========================================================================
 * Boîte de décisions — l'IA/les automatisations proposent, l'admin valide
 * =========================================================================
 * Les producteurs déposent des propositions dans `decision_queue`
 * (status='pending'). L'admin les approuve ou les refuse depuis
 * /admin/system/decisions ; l'approbation exécute l'action proposée
 * (ex. envoi d'un email pré-rédigé). Rien ne part sans validation.
 */

interface ProposedAction {
    kind: 'email' | 'none';
    to?: string;
    subject?: string;
    body?: string;
}

async function hasPendingDecision(schoolId: string, type: string): Promise<boolean> {
    const snap = await db.collection('decision_queue')
        .where('schoolId', '==', schoolId)
        .where('type', '==', type)
        .where('status', '==', 'pending')
        .limit(1)
        .get();
    return !snap.empty;
}

async function createDecision(params: {
    type: string;
    title: string;
    description: string;
    schoolId: string;
    schoolName: string;
    proposedAction: ProposedAction;
    source: string;
}): Promise<void> {
    await db.collection('decision_queue').add({
        ...params,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
    });
}

async function latestActivityDate(schoolId: string): Promise<Date | null> {
    const dates: Date[] = [];
    for (const sub of ['notifications', 'comptabilite']) {
        try {
            const snap = await db.collection(`ecoles/${schoolId}/${sub}`)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            const ts = snap.docs[0]?.data()?.createdAt;
            const d = ts?.toDate?.();
            if (d) dates.push(d);
        } catch {
            // sous-collection absente : signal ignoré
        }
    }
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
}

const SILENT_CHURN_DAYS = 30;

/**
 * Chaque jour, détecte les situations qui méritent une décision humaine
 * et les dépose dans la boîte de décisions (une seule proposition en
 * attente par école et par type) :
 * - churn silencieux : abonnement actif mais aucune activité depuis 30 j,
 *   avec un email de réengagement pré-rédigé à approuver ;
 * - impayé : école en past_due, proposition d'appel personnel.
 */
export const proposeDecisions = onSchedule(
    {
        schedule: 'every day 06:30',
        timeZone: 'Africa/Abidjan',
        timeoutSeconds: 540,
        memory: '512MiB',
    },
    async () => {
        const now = new Date();
        const schoolsSnap = await db.collection('ecoles').get();
        let proposed = 0;

        for (const doc of schoolsSnap.docs) {
            const school = doc.data() as SchoolShape;
            if (school.status === 'deleted') continue;
            const sub = school.subscription;
            const schoolName = school.name ?? doc.id;

            try {
                if (sub?.status === 'active') {
                    const lastActivity = await latestActivityDate(doc.id);
                    const inactiveDays = lastActivity
                        ? differenceInCalendarDays(now, lastActivity)
                        : null;
                    if ((inactiveDays === null || inactiveDays >= SILENT_CHURN_DAYS)
                        && !(await hasPendingDecision(doc.id, 'silent_churn'))) {
                        const daysLabel = inactiveDays === null ? 'longtemps' : `${inactiveDays} jours`;
                        await createDecision({
                            type: 'silent_churn',
                            title: `Churn silencieux : ${schoolName}`,
                            description: `Abonnement actif mais aucune activité détectée depuis ${daysLabel} `
                                + `(ni notification, ni écriture comptable). Cette école risque de ne pas renouveler. `
                                + `Proposition : envoyer l'email de réengagement ci-dessous, puis prévoir un appel.`,
                            schoolId: doc.id,
                            schoolName,
                            source: 'detecteur_churn_silencieux',
                            proposedAction: school.directorEmail ? {
                                kind: 'email',
                                to: school.directorEmail,
                                subject: `Comment pouvons-nous vous aider, ${schoolName} ?`,
                                body: `Bonjour,\n\nNous avons remarqué que votre espace GèreEcole pour ${schoolName} `
                                    + `est peu utilisé ces dernières semaines. Un point vous bloque peut-être : `
                                    + `configuration, import des élèves, prise en main par votre équipe ?\n\n`
                                    + `Nous pouvons faire la configuration avec vous, à distance et gratuitement. `
                                    + `Répondez simplement à cet email ou appelez-nous, et nous trouvons un créneau cette semaine.\n\n`
                                    + `L'équipe GèreEcole`,
                            } : { kind: 'none' },
                        });
                        proposed += 1;
                    }
                }

                if (sub?.status === 'past_due'
                    && !(await hasPendingDecision(doc.id, 'past_due_call'))) {
                    await createDecision({
                        type: 'past_due_call',
                        title: `Impayé à traiter : ${schoolName}`,
                        description: `L'école est en période de grâce (past_due) depuis le `
                            + `${sub.pastDueSince ? format(new Date(sub.pastDueSince), 'd MMMM yyyy', { locale: fr }) : '—'}. `
                            + `Les rappels automatiques sont partis ; proposition : un appel personnel au directeur `
                            + `avant la suspension (approuvez pour tracer la décision d'appeler).`,
                        schoolId: doc.id,
                        schoolName,
                        source: 'detecteur_impayes',
                        proposedAction: { kind: 'none' },
                    });
                    proposed += 1;
                }
            } catch (err) {
                logger.error('[proposeDecisions] erreur pour une école', { schoolId: doc.id, err });
            }
        }

        logger.info('[proposeDecisions] terminé', { scanned: schoolsSnap.size, proposed });
    },
);

/* =========================================================================
 * Assistant support IA — brouillon de réponse pour chaque ticket
 * =========================================================================
 * À la création d'un ticket dans `support_tickets`, un brouillon de
 * réponse est généré (Gemini via GOOGLE_GENAI_API_KEY, ou gabarit de
 * secours sans clé) puis déposé dans la boîte de décisions : l'admin
 * relit, ajuste sa décision et approuve — l'email ne part jamais seul.
 */

interface SupportTicketShape {
    userId?: string;
    schoolId?: string;
    subject?: string;
    category?: string;
    description?: string;
    status?: string;
    userDisplayName?: string;
    userEmail?: string;
}

async function generateSupportDraft(params: {
    schoolName: string;
    userDisplayName: string;
    subject: string;
    category: string;
    description: string;
}): Promise<{ draft: string; generatedBy: 'ia' | 'gabarit' }> {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    const model = process.env.GENAI_MODEL || 'gemini-1.5-flash';

    const fallback = {
        draft: `Bonjour ${params.userDisplayName},\n\n`
            + `Merci pour votre message concernant « ${params.subject} ». `
            + `Nous avons bien reçu votre demande et nous la traitons en priorité.\n\n`
            + `Pour aller plus vite, pouvez-vous nous préciser, si possible, une capture d'écran `
            + `ou les étapes exactes qui mènent au problème ?\n\n`
            + `Nous revenons vers vous très rapidement.\n\nL'équipe GèreEcole`,
        generatedBy: 'gabarit' as const,
    };

    if (!apiKey) return fallback;

    const prompt = `Tu es l'assistant support de GèreEcole, une application de gestion scolaire `
        + `(élèves, classes, notes, paiements, portail parents) utilisée par des directeurs d'école en Afrique francophone.\n\n`
        + `Rédige une réponse d'email au ticket support ci-dessous. Règles :\n`
        + `- Français chaleureux et professionnel, tutoiement interdit.\n`
        + `- Réponds concrètement si le problème est identifiable (guide pas à pas court) ; sinon pose 1 à 2 questions de clarification précises.\n`
        + `- Maximum 150 mots. Pas d'objet, uniquement le corps. Signe « L'équipe GèreEcole ».\n`
        + `- Ne promets jamais de délai précis ni de remboursement.\n\n`
        + `École : ${params.schoolName}\nDemandeur : ${params.userDisplayName}\n`
        + `Catégorie : ${params.category}\nSujet : ${params.subject}\n\nMessage :\n${params.description}`;

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
                }),
            },
        );
        if (!res.ok) {
            logger.warn('[supportAssistant] Gemini API non-OK', { status: res.status });
            return fallback;
        }
        const data = await res.json() as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim();
        if (!text) return fallback;
        return { draft: text, generatedBy: 'ia' };
    } catch (err) {
        logger.warn('[supportAssistant] appel Gemini échoué, gabarit utilisé', err);
        return fallback;
    }
}

export const onSupportTicketCreated = onDocumentCreated('support_tickets/{ticketId}', async event => {
    const snap = event.data;
    if (!snap) return;
    const ticket = snap.data() as SupportTicketShape;
    const ticketId = event.params.ticketId as string;

    const subject = ticket.subject ?? 'Demande de support';
    const userDisplayName = ticket.userDisplayName ?? 'Directeur';

    let schoolName = ticket.schoolId ?? '—';
    let directorEmail: string | null = null;
    if (ticket.schoolId) {
        try {
            const schoolSnap = await db.doc(`ecoles/${ticket.schoolId}`).get();
            const school = schoolSnap.data() as SchoolShape | undefined;
            schoolName = school?.name ?? schoolName;
            directorEmail = school?.directorEmail ?? null;
        } catch {
            // école introuvable : le brouillon reste utilisable
        }
    }

    try {
        const { draft, generatedBy } = await generateSupportDraft({
            schoolName,
            userDisplayName,
            subject,
            category: ticket.category ?? 'Général',
            description: ticket.description ?? '',
        });

        const to = ticket.userEmail ?? directorEmail;
        const excerpt = (ticket.description ?? '').slice(0, 300);

        await db.collection('decision_queue').add({
            type: 'support_reply',
            title: `Réponse au ticket : ${subject}`,
            description: `Ticket de ${userDisplayName} (${schoolName}) — catégorie « ${ticket.category ?? 'Général'} ».\n\n`
                + `Demande : ${excerpt}${(ticket.description ?? '').length > 300 ? '…' : ''}\n\n`
                + (generatedBy === 'ia'
                    ? `Brouillon rédigé par l'IA — relisez et ajustez avant d'approuver.`
                    : `Brouillon générique (clé IA non configurée) — personnalisez avant d'approuver.`)
                + (to ? '' : `\n\n⚠️ Aucune adresse email trouvée pour ce demandeur : approuver enregistrera la décision sans envoi.\n\nBrouillon proposé :\n${draft}`),
            schoolId: ticket.schoolId ?? null,
            schoolName,
            source: generatedBy === 'ia' ? 'assistant_support_ia' : 'assistant_support',
            ticketId,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            proposedAction: to
                ? { kind: 'email', to, subject: `Re: ${subject}`, body: draft }
                : { kind: 'none' },
        });

        logger.info('[onSupportTicketCreated] brouillon déposé dans la boîte de décisions', {
            ticketId, schoolId: ticket.schoolId, generatedBy,
        });
    } catch (err) {
        logger.error('[onSupportTicketCreated] erreur', { ticketId, err });
    }
});

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

/* =========================================================================
 * Module C — Campagnes email/WhatsApp en masse
 * ========================================================================= */

interface CampaignTarget {
    type: 'all' | 'plan' | 'status' | 'school';
    values?: string[];
}

interface CampaignDoc {
    name?: string;
    channel: 'email' | 'whatsapp';
    subject?: string;
    body: string;
    target: CampaignTarget;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
}

function renderTpl(tpl: string, vars: Record<string, string | number>): string {
    return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => {
        const v = vars[key as string];
        return v === undefined || v === null ? m : String(v);
    });
}

function matchesCampaignTarget(target: CampaignTarget, school: { id: string; plan?: string; status?: string }): boolean {
    switch (target.type) {
        case 'all': return true;
        case 'plan': return !!school.plan && (target.values ?? []).includes(school.plan);
        case 'status': return !!school.status && (target.values ?? []).includes(school.status);
        case 'school': return (target.values ?? []).includes(school.id);
        default: return false;
    }
}

/**
 * Quand une campagne passe en `sending`, parcourt les écoles cibles
 * et dépose un email (ou un message WhatsApp via la file `whatsapp_outbox`)
 * par destinataire. Marque ensuite la campagne `sent` ou `failed`.
 */
export const processCampaign = onDocumentUpdated('campaigns/{campaignId}', async event => {
    const before = event.data?.before.data() as CampaignDoc | undefined;
    const after = event.data?.after.data() as CampaignDoc | undefined;
    if (!after) return;
    // On ne traite que la transition vers `sending`.
    if (before?.status === 'sending' || after.status !== 'sending') return;

    const campaignId = event.params.campaignId as string;
    const ref = db.doc(`campaigns/${campaignId}`);
    const startedAt = FieldValue.serverTimestamp();

    try {
        const schoolsSnap = await db.collection('ecoles').get();
        const matching = schoolsSnap.docs.filter(d => {
            const data = d.data() as SchoolShape;
            return matchesCampaignTarget(after.target, {
                id: d.id,
                plan: data.subscription?.plan,
                status: data.subscription?.status,
            });
        });

        let queued = 0;
        let failed = 0;

        for (const schoolDoc of matching) {
            const school = schoolDoc.data() as SchoolShape & { directorFirstName?: string; directorLastName?: string };
            const sub = school.subscription;
            const endDate = sub?.endDate ? new Date(sub.endDate) : null;
            const daysLeft = endDate && !Number.isNaN(endDate.getTime())
                ? differenceInCalendarDays(endDate, new Date())
                : 0;
            const vars = {
                schoolName: school.name ?? 'votre école',
                directorName: `${school.directorFirstName ?? ''} ${school.directorLastName ?? ''}`.trim() || 'Directeur',
                plan: sub?.plan ?? '—',
                daysLeft: String(daysLeft),
                endDate: endDate ? format(endDate, 'd MMMM yyyy', { locale: fr }) : '—',
            } as Record<string, string>;

            const renderedBody = renderTpl(after.body, vars);
            const renderedSubject = after.subject ? renderTpl(after.subject, vars) : undefined;

            try {
                if (after.channel === 'email') {
                    if (!school.directorEmail) { failed += 1; continue; }
                    await db.collection('mail').add({
                        to: school.directorEmail,
                        message: {
                            subject: renderedSubject ?? `Communication GèreEcole`,
                            html: `<div style="font-family: sans-serif; line-height: 1.6; white-space: pre-wrap;">${renderedBody.replace(/\n/g, '<br/>')}</div>`,
                            text: renderedBody,
                        },
                        delivery: { startTime: FieldValue.serverTimestamp(), state: 'PENDING' },
                        campaignId,
                        schoolId: schoolDoc.id,
                    });
                } else {
                    // WhatsApp : on enfile dans une outbox que l'intégration
                    // existante (webhook + provider) consommera.
                    await db.collection('whatsapp_outbox').add({
                        schoolId: schoolDoc.id,
                        body: renderedBody,
                        campaignId,
                        status: 'pending',
                        createdAt: FieldValue.serverTimestamp(),
                    });
                }
                queued += 1;
            } catch (err) {
                logger.error('[processCampaign] envoi échoué', { campaignId, schoolId: schoolDoc.id, err });
                failed += 1;
            }
        }

        await ref.update({
            status: failed === matching.length && matching.length > 0 ? 'failed' : 'sent',
            stats: {
                targetCount: matching.length,
                queued,
                failed,
                startedAt,
                completedAt: FieldValue.serverTimestamp(),
            },
        });

        logger.info('[processCampaign] terminé', { campaignId, targetCount: matching.length, queued, failed });
    } catch (err) {
        logger.error('[processCampaign] erreur fatale', { campaignId, err });
        await ref.update({ status: 'failed' });
    }
});

/**
 * Toutes les 10 minutes, déclenche les campagnes programmées dont
 * `scheduledAt` est passé. On passe simplement le statut à `sending`
 * pour réutiliser le pipeline `processCampaign` ci-dessus.
 */
export const triggerScheduledCampaigns = onSchedule(
    { schedule: 'every 10 minutes', timeZone: 'Africa/Abidjan' },
    async () => {
        const nowIso = new Date().toISOString();
        const snap = await db.collection('campaigns')
            .where('status', '==', 'scheduled')
            .where('scheduledAt', '<=', nowIso)
            .get();
        if (snap.empty) return;
        await Promise.all(snap.docs.map(d => d.ref.update({ status: 'sending' })));
        logger.info('[triggerScheduledCampaigns] déclenchées', { count: snap.size });
    },
);

// Export pour les tests (non utilisé par Firebase).
export const __internals = { pickReminderBucket, pickNurtureStep, pickSubscriptionEvent, todayKey, PAST_DUE_GRACE_DAYS, renderTpl, matchesCampaignTarget };
// Suppress unused warnings for Timestamp import (kept for downstream typing).
export type _Timestamp = Timestamp;
