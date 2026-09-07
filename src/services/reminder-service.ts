import { formatCurrency } from '@/lib/currency-utils';
import type { student } from '@/lib/data-types';

export class ReminderService {
    /**
     * Nettoie et formate un numéro de téléphone pour WhatsApp/SMS.
     * Enlève les espaces, les tirets, et les plus.
     * Ajoute le préfixe pays si manquant (ex: 225 pour la Côte d'Ivoire).
     */
    static formatPhoneForWhatsApp(phone: string, defaultCountryCode: string = '225'): string {
        if (!phone) return '';
        let cleaned = phone.replace(/\D/g, '');
        
        // Si le numéro commence par 0 et a 10 chiffres (format CI standard ex: 0759951453), on ajoute l'indicatif
        if (cleaned.startsWith('0') && cleaned.length === 10) {
            cleaned = `${defaultCountryCode}${cleaned.slice(1)}`;
        } else if (cleaned.length === 10 && !cleaned.startsWith(defaultCountryCode)) {
            cleaned = `${defaultCountryCode}${cleaned}`;
        }
        
        return cleaned;
    }

    /**
     * Détermine le contact et le nom du parent à contacter
     */
    static getParentContact(studentData: student): { name: string; phone: string } {
        const parentName = studentData.parent1FirstName 
            ? `${studentData.parent1FirstName} ${studentData.parent1LastName || ''}`.trim()
            : 'Cher parent';
            
        let phone = studentData.parent1Contact;
        if (!phone && studentData.parent2Contact) {
            phone = studentData.parent2Contact;
        }

        return { name: parentName, phone: phone || '' };
    }

    /**
     * Génère l'URL WhatsApp avec un message pré-rempli pour une relance d'impayé.
     */
    static generateWhatsAppPaymentReminder(
        studentData: student,
        schoolName: string
    ): string {
        const { name: parentName, phone } = this.getParentContact(studentData);

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

    /**
     * Ouvre directement la conversation WhatsApp de relance dans un nouvel onglet
     */
    static triggerWhatsAppReminder(studentData: student, schoolName: string) {
        const url = this.generateWhatsAppPaymentReminder(studentData, schoolName);
        if (typeof window !== 'undefined') {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }
}

