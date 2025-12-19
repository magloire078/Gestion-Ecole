
'use server';

import { getOrangeMoneyPaymentLink } from '@/lib/orange-money';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createWaveCheckoutSession } from '@/lib/wave';
import type { User } from 'firebase/auth';

interface PaymentProviderData {
    plan: string;
    price: string;
    description: string;
    user: User;
    schoolId: string;
}

type PaymentProvider = 'orangemoney' | 'stripe' | 'wave';

export async function createCheckoutLink(provider: PaymentProvider, data: PaymentProviderData) {
    const { plan, price, description, user, schoolId } = data;
    const BASE_APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    const successUrl = `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=success`;
    const cancelUrl = `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=canceled`;

    if (provider === 'orangemoney') {
        const transactionId = `${schoolId}_${new Date().getTime()}`;
        const paymentData = {
            merchant_key: process.env.ORANGE_MONEY_CLIENT_ID || '',
            currency: 'XOF' as const,
            order_id: transactionId,
            amount: parseInt(price, 10),
            return_url: successUrl,
            cancel_url: cancelUrl,
            notif_url: `${BASE_APP_URL}/api/webhooks/orangemoney`,
            lang: 'fr' as const,
            reference: description,
        };

        const paymentLink = await getOrangeMoneyPaymentLink(paymentData);
        if (paymentLink) return { url: paymentLink, error: null };
        return { url: null, error: "Impossible de générer le lien de paiement Orange Money." };
    }

    if (provider === 'wave') {
        const paymentData = {
            amount: price,
            currency: 'XOF' as const,
            success_url: successUrl,
            error_url: cancelUrl,
        };
        const paymentLink = await createWaveCheckoutSession(paymentData);
        if (paymentLink) return { url: paymentLink, error: null };
        return { url: null, error: "Impossible de générer le lien de paiement Wave." };
    }

    if (provider === 'stripe') {
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
        if (url) return { url, error: null };
        return { url: null, error: error || "Impossible de générer le lien de paiement Stripe." };
    }
    
    return { url: null, error: 'Fournisseur de paiement non supporté.' };
}
