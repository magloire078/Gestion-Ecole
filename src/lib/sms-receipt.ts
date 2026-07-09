
// Formatage du SMS de reçu de paiement, calqué sur le modèle des reçus Orange Money.

export interface PaymentReceiptSmsData {
    /** Référence/ID de la transaction (ex: PAY-123456 ou ID Orange Money). */
    reference: string;
    /** Montant payé en FCFA. */
    amount: number;
    /** Nom de l'établissement. */
    schoolName: string;
    /** Nature du paiement (ex: "Inscription", "Scolarité"). */
    paymentNature: string;
    /** Nom de la classe (ex: "CP2"). */
    className?: string;
    /** Niveau/cycle (ex: "Primaire"). */
    level?: string;
    /** Date de naissance de l'élève (ISO ou déjà formatée). */
    dateOfBirth?: string;
    /** Nom et prénoms de l'élève. */
    studentName: string;
    /** Nom du payeur. */
    payerName: string;
    /** Numéro de téléphone du payeur. */
    payerPhone?: string;
    /** Date du paiement. */
    date: Date;
}

function formatDateFr(isoOrFormatted: string): string {
    const d = new Date(isoOrFormatted);
    if (isNaN(d.getTime())) return isoOrFormatted;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Construit le corps du SMS de reçu de paiement.
 * Exemple de rendu :
 *
 *   RECU DE PAIEMENT
 *   ID: PAY-123456
 *   Montant: 111110 FCFA
 *   Partenaire: EPC ST JEAN DE MOROFE DE YAMOUSSOUKRO
 *   Service: Paiement de scolarite
 *   Classe: CP2
 *   Date de naissance: 18/02/2020
 *   Nature du paiement: Inscription
 *   Niveau: Primaire
 *   Nom et prenoms de l'eleve: KOUADIO KOUADIO LEMIENSSAH ELIAS
 *   Nom du Payeur: NOELLIE BHELLYS ANDRE
 *   Numero du Payeur: 0747286934
 *   Date: 09/07/2026 a 10:41:38
 *   Statut: Paiement reussi
 */
export function formatPaymentReceiptSms(data: PaymentReceiptSmsData): string {
    const dateStr = data.date.toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'Africa/Abidjan',
    });
    const timeStr = data.date.toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Africa/Abidjan',
    });

    const lines = [
        'RECU DE PAIEMENT',
        `ID: ${data.reference}`,
        `Montant: ${Math.round(data.amount)} FCFA`,
        `Partenaire: ${data.schoolName.toUpperCase()}`,
        'Service: Paiement de scolarite',
        data.className ? `Classe: ${data.className}` : null,
        data.dateOfBirth ? `Date de naissance: ${formatDateFr(data.dateOfBirth)}` : null,
        `Nature du paiement: ${data.paymentNature}`,
        data.level ? `Niveau: ${data.level}` : null,
        `Nom et prenoms de l'eleve: ${data.studentName.toUpperCase()}`,
        `Nom du Payeur: ${data.payerName.toUpperCase()}`,
        data.payerPhone ? `Numero du Payeur: ${data.payerPhone}` : null,
        `Date: ${dateStr} a ${timeStr}`,
        'Statut: Paiement reussi',
    ];

    return lines.filter((l): l is string => Boolean(l)).join('\n');
}
