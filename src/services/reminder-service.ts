import { formatCurrency } from '@/lib/currency-utils';
import type { student } from '@/lib/data-types';

export class ReminderService {
    /**
     * Nettoie et formate un numéro de téléphone pour WhatsApp.
     * Enlève les espaces, les tirets, et les plus.
     */
    static formatPhoneForWhatsApp(phone: string): string {
        if (!phone) return '';
        // Supprime tout ce qui n'est pas un chiffre
        let cleaned = phone.replace(/\D/g, '');
        return cleaned;
    }

    /**
     * Génère l'URL WhatsApp avec un message pré-rempli pour une relance d'impayé.
     */
    static generateWhatsAppPaymentReminder(
        studentData: student,
        schoolName: string
    ): string {
        // Déterminer le parent à contacter en priorité
        const parentName = studentData.parent1FirstName || 'Cher parent';
        let phone = studentData.parent1Contact;

        if (!phone && studentData.parent2Contact) {
            phone = studentData.parent2Contact;
        }

        if (!phone) {
            throw new Error("Aucun numéro de téléphone disponible pour les parents de cet élève.");
        }

        const cleanPhone = this.formatPhoneForWhatsApp(phone);
        const amount = formatCurrency(studentData.amountDue || 0);

        const message = 
`Bonjour ${parentName},
Sauf erreur ou omission de notre part, nous constatons un solde restant de ${amount} sur les frais de scolarité de votre enfant *${studentData.firstName} ${studentData.lastName}*.

Nous vous prions de bien vouloir régulariser cette situation dans les plus brefs délais. 
N'hésitez pas à nous contacter si le paiement a déjà été effectué ou si vous souhaitez en discuter.

Cordialement,
La Direction - ${schoolName}`;

        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }
}
