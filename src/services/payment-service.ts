
'use server';

import { getOrangeMoneyPaymentLink } from '@/lib/orange-money';
import { createStripeCheckoutSession } from '@/lib/stripe';
import type { User } from 'firebase/auth';

interface PaymentProviderData {
    plan: string;
    price: string;
    description: string;
    user: User;
    schoolId: string;
}

type PaymentProvider = 'orangemoney' | 'stripe';

export async function createCheckoutLink(provider: PaymentProvider, data: PaymentProviderData) {
    const { plan, price, description, user, schoolId } = data;
    const BASE_APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

    if (provider === 'orangemoney') {
        const [firstName, ...lastNameParts] = user.displayName?.split(' ') || ['Utilisateur', 'Anonyme'];
        const lastName = lastNameParts.join(' ');
        const transactionId = `${schoolId}_${new Date().getTime()}`;

        // L'API Orange Money nécessite une clé marchand (merchant_key) qui semble être l'ID client
        const paymentData = {
            merchant_key: process.env.ORANGE_MONEY_CLIENT_ID || '',
            currency: 'XOF' as const,
            order_id: transactionId,
            amount: parseInt(price, 10),
            return_url: `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=success`,
            cancel_url: `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=canceled`,
            notif_url: `${BASE_APP_URL}/api/webhooks/orangemoney`,
            lang: 'fr' as const,
            reference: description,
        };

        const paymentLink = await getOrangeMoneyPaymentLink(paymentData);

        if (paymentLink) {
            return { url: paymentLink, error: null };
        } else {
            return { url: null, error: "Impossible de générer le lien de paiement Orange Money. Veuillez contacter le support." };
        }
    }

    if (provider === 'stripe') {
        // Convertir XOF en EUR pour Stripe (taux fixe)
        // Ce taux doit être vérifié et mis à jour si nécessaire
        const XOF_TO_EUR_RATE = 655.957;
        const priceInEUR = parseInt(price, 10) / XOF_TO_EUR_RATE;
        const priceInCents = Math.round(priceInEUR * 100);
        
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
