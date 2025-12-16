
'use server';

import { getCinetPayPaymentLink } from '@/lib/cinetpay';
import { createStripeCheckoutSession } from '@/lib/stripe';
import type { User } from 'firebase/auth';

interface PaymentProviderData {
    plan: string;
    price: string;
    description: string;
    user: User;
    schoolId: string;
}

type PaymentProvider = 'cinetpay' | 'stripe';

export async function createCheckoutLink(provider: PaymentProvider, data: PaymentProviderData) {
    const { plan, price, description, user, schoolId } = data;

    if (provider === 'cinetpay') {
        const [firstName, ...lastNameParts] = user.displayName?.split(' ') || ['Utilisateur', 'Anonyme'];
        const lastName = lastNameParts.join(' ');
        const transactionId = `${schoolId}_${new Date().getTime()}`;

        const paymentData = {
            amount: parseInt(price, 10),
            currency: 'XOF',
            transaction_id: transactionId,
            description: description,
            customer_name: firstName,
            customer_surname: lastName,
            customer_email: user.email || 'no-email@example.com',
        };

        const paymentLink = await getCinetPayPaymentLink(paymentData);

        if (paymentLink) {
            return { url: paymentLink, error: null };
        } else {
            return { url: null, error: "Impossible de générer le lien de paiement CinetPay. Veuillez contacter le support." };
        }
    }

    if (provider === 'stripe') {
        const priceInCents = Math.round(parseInt(price, 10) / 655.957 * 100);
        
        const sessionData = {
            priceInCents,
            planName: plan,
            description: description,
            clientReferenceId: schoolId,
            customerEmail: user.email,
        };

        const { url, error } = await createStripeCheckoutSession(sessionData);

        if (url) {
            return { url, error: null };
        } else {
            return { url: null, error: error || "Impossible de générer le lien de paiement Stripe. Veuillez contacter le support." };
        }
    }
    
    return { url: null, error: 'Fournisseur de paiement non supporté.' };
}
