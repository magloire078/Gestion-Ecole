/**
 * Template d'email de rappel d'abonnement, partagé entre la route API et
 * (par convention) la Cloud Function. Le module n'a aucune dépendance
 * Firebase pour rester portable.
 */

export interface ReminderTemplateInput {
    schoolName: string;
    planName: string;
    endDate: Date;
    daysLeft: number;
    locale?: string;
}

export interface RenderedReminder {
    subject: string;
    html: string;
    title: string;
    body: string;
}

function formatDateFr(d: Date): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function renderReminderEmail(input: ReminderTemplateInput): RenderedReminder {
    const dateLabel = formatDateFr(input.endDate);
    const isExpired = input.daysLeft < 0;
    const isDayBefore = input.daysLeft === 1;
    const horizonLabel = isExpired
        ? 'expiré'
        : isDayBefore
            ? 'demain'
            : `dans ${input.daysLeft} jours`;

    const subject = isExpired
        ? `Abonnement expiré - ${input.schoolName}`
        : `Renouvellement à venir (${horizonLabel}) - ${input.schoolName}`;

    const title = isExpired
        ? 'Abonnement expiré'
        : `Renouvellement prévu ${horizonLabel}`;

    const body = isExpired
        ? `L'abonnement <strong>${input.planName}</strong> pour <strong>${input.schoolName}</strong> est arrivé à expiration le <strong>${dateLabel}</strong>.`
        : `Votre abonnement <strong>${input.planName}</strong> pour <strong>${input.schoolName}</strong> arrive à échéance le <strong>${dateLabel}</strong>.`;

    const cta = isExpired ? 'Renouveler l\'abonnement' : 'Renouveler maintenant';

    const html = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #0C365A; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">GèreEcole</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #0C365A;">${title}</h2>
                <p>${body}</p>
                <p>Pour éviter toute interruption de service, renouvelez votre abonnement dès maintenant depuis votre tableau de bord.</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="https://gereecole.com/dashboard/parametres/abonnement" style="background-color: #2D9CDB; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">${cta}</a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 0.8em; color: #777; text-align: center;">L'équipe GèreEcole</p>
            </div>
        </div>
    `;

    return { subject, html, title, body };
}
