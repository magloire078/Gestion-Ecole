
'use server';

import { getOrangeMoneyPaymentLink } from '@/lib/orange-money';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createWaveCheckoutSession } from '@/lib/wave';
import { requestMtnMomoPayment } from '@/lib/mtn-momo';
import { createPayDunyaCheckout } from '@/lib/paydunya';
import type { User } from 'firebase/auth';

interface PaymentProviderData {
    plan: string;
    price: string;
    description: string;
    user: User;
    schoolId: string;
    phoneNumber?: string; // For mobile money payments
    duration: number; // Duration in months
}

type PaymentProvider = 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya';

export async function createCheckoutLink(provider: PaymentProvider, data: PaymentProviderData) {
    const { plan, price, description, user, schoolId, phoneNumber, duration } = data;
    const BASE_APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    
    const successUrl = `${BASE_APP_URL}/dashboard/parametres/abonnement/paiement-en-attente?payment_status=success`;
    const cancelUrl = `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=canceled`;
    const pendingUrl = `${BASE_APP_URL}/dashboard/parametres/abonnement/paiement-en-attente`;

    if (provider === 'orangemoney') {
        const orderId = `${schoolId}_${duration}m_${new Date().getTime()}`;
        
        const paymentData = {
            merchant_key: process.env.ORANGE_MONEY_CLIENT_ID || '',
            currency: 'XOF' as const,
            order_id: orderId,
            amount: parseInt(price, 10),
            return_url: successUrl,
            cancel_url: cancelUrl,
            notif_url: `${BASE_APP_URL}/api/webhooks/orangemoney`,
            lang: 'fr' as const,
            reference: schoolId, 
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
            client_reference: `${schoolId}_${duration}m_${new Date().getTime()}`
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
            clientReferenceId: `${schoolId}__${duration}`,
            customerEmail: user.email,
        };

        const { url, error } = await createStripeCheckoutSession(sessionData);
        if (url) return { url, error: null };
        return { url: null, error: error || "Impossible de générer le lien de paiement Stripe." };
    }

    if (provider === 'mtn') {
        if (!phoneNumber) {
            return { url: null, error: 'Le numéro de téléphone est requis pour le paiement MTN.' };
        }
        const transactionId = `${schoolId}_${duration}m_${new Date().getTime()}`;
        
        const paymentData = {
            amount: price,
            currency: 'EUR' as const,
            externalId: transactionId,
            payer: {
                partyIdType: 'MSISDN' as const,
                partyId: phoneNumber,
            },
            payerMessage: `Paiement GèreEcole - ${plan}`,
            payeeNote: `Abonnement ${plan} pour ${schoolId}`,
        };

        const { success, message } = await requestMtnMomoPayment(paymentData);
        if (success) {
            return { url: pendingUrl, error: null };
        }
        return { url: null, error: message };
    }

    if (provider === 'paydunya') {
        const referenceId = `${schoolId}_${duration}m_${new Date().getTime()}`;
        const paymentData = {
            total_amount: parseInt(price, 10),
            description: description,
            custom_data: {
                reference: referenceId,
                plan: plan,
                user_id: user.uid,
            },
            return_url: successUrl,
            cancel_url: cancelUrl,
            callback_url: `${BASE_APP_URL}/api/webhooks/paydunya`,
        };

        const { url, error } = await createPayDunyaCheckout(paymentData);
        if (url) return { url, error: null };
        return { url: null, error: error || "Impossible de générer le lien de paiement PayDunya." };
    }
    
    return { url: null, error: 'Fournisseur de paiement non supporté.' };
}
