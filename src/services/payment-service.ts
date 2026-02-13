
'use server';

import { getOrangeMoneyPaymentLink } from '@/lib/orange-money';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createWaveCheckoutSession } from '@/lib/wave';
import { requestMtnMomoPayment } from '@/lib/mtn-momo';
import { createPayDunyaCheckout } from '@/lib/paydunya';
import { createGeniusPayment } from '@/lib/genius-pay';
import type { User } from 'firebase/auth';

interface PaymentProviderData {
    type: 'subscription' | 'tuition';
    price: string;
    description: string;
    user: User;
    schoolId: string;
    // For subscription
    plan?: string;
    duration?: number;
    // For tuition
    studentId?: string;
    // For mobile money
    phoneNumber?: string;
}

type PaymentProvider = 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya' | 'genius';

export async function createCheckoutLink(provider: PaymentProvider, data: PaymentProviderData) {
    const { type, price: clientPrice, description, user, schoolId, phoneNumber, plan, duration, studentId } = data;
    const BASE_APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

    // SERVER-SIDE PRICE VALIDATION (SECURITY FIX)
    let finalPrice = clientPrice;
    if (type === 'subscription') {
        if (!plan) return { url: null, error: "Plan non spécifié." };
        const durationMonths = duration || 1;
        try {
            // Import dynamically to avoid circular deps if any (though here it's fine)
            const { getPlanPrice } = await import('@/lib/subscription-plans');
            const officialPrice = getPlanPrice(plan as any, durationMonths);

            // Overwrite the client price with the official price
            finalPrice = officialPrice.toString();

            console.log(`[PaymentService] Security Check: Enforcing server price ${finalPrice} for plan ${plan} (${durationMonths} months). Client sent: ${clientPrice}`);
        } catch (e) {
            console.error("Invalid plan or duration:", e);
            return { url: null, error: "Plan ou durée invalide." };
        }
    }

    const successUrl = `${BASE_APP_URL}/dashboard/parametres/abonnement/paiement-en-attente?payment_status=success`;
    const cancelUrl = `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=canceled`;
    const pendingUrl = `${BASE_APP_URL}/dashboard/parametres/abonnement/paiement-en-attente`;

    const getReferenceId = (separator = '_') => {
        const timestamp = new Date().getTime();
        if (type === 'tuition' && studentId) {
            return `tuition${separator}${schoolId}${separator}${studentId}${separator}${finalPrice}${separator}${timestamp}`;
        }
        if (type === 'subscription' && plan && duration) {
            // Include price in ref if needed, but we rely on server validation now
            return `subscription${separator}${schoolId}${separator}${plan}${separator}${duration}m${separator}${timestamp}`;
        }
        // Fallback
        return `${schoolId}${separator}${timestamp}`;
    };

    if (provider === 'orangemoney') {
        const orderId = getReferenceId();
        const paymentData = {
            merchant_key: process.env.ORANGE_MONEY_CLIENT_ID || '',
            currency: 'XOF' as const,
            order_id: orderId,
            amount: parseInt(finalPrice, 10),
            return_url: successUrl,
            cancel_url: cancelUrl,
            notif_url: `${BASE_APP_URL}/api/webhooks/orangemoney`,
            lang: 'fr' as const,
            reference: schoolId, // Orange uses this as the main identifier
        };
        const paymentLink = await getOrangeMoneyPaymentLink(paymentData);
        if (paymentLink) return { url: paymentLink, error: null };
        return { url: null, error: "Impossible de générer le lien de paiement Orange Money." };
    }

    if (provider === 'wave') {
        const paymentData = {
            amount: finalPrice,
            currency: 'XOF' as const,
            success_url: successUrl,
            error_url: cancelUrl,
            client_reference: getReferenceId(),
        };
        const paymentLink = await createWaveCheckoutSession(paymentData);
        if (paymentLink) return { url: paymentLink, error: null };
        return { url: null, error: "Impossible de générer le lien de paiement Wave." };
    }

    if (provider === 'stripe') {
        const XOF_TO_EUR_RATE = 655.957;
        const priceInEUR = parseInt(finalPrice, 10) / XOF_TO_EUR_RATE;
        const priceInCents = Math.round(priceInEUR * 100);

        const clientReferenceId = getReferenceId('__');

        const sessionData = {
            priceInCents,
            planName: type === 'tuition' ? 'Frais de scolarité' : plan || 'Abonnement',
            description,
            clientReferenceId,
            customerEmail: user.email || undefined,
        };

        const { url, error } = await createStripeCheckoutSession(sessionData);
        if (url) return { url, error: null };
        return { url: null, error: error || "Impossible de générer le lien de paiement Stripe." };
    }

    if (provider === 'mtn') {
        if (!phoneNumber) return { url: null, error: 'Le numéro de téléphone est requis pour le paiement MTN.' };
        const paymentData = {
            amount: finalPrice,
            currency: 'EUR' as const, // Sandbox specific
            externalId: getReferenceId(),
            payer: {
                partyIdType: 'MSISDN' as const,
                partyId: phoneNumber,
            },
            payerMessage: description,
            payeeNote: `Ref: ${schoolId}`,
        };
        const { success, message } = await requestMtnMomoPayment(paymentData);
        if (success) return { url: pendingUrl, error: null };
        return { url: null, error: message };
    }

    if (provider === 'paydunya') {
        const paymentData = {
            total_amount: parseInt(finalPrice, 10),
            description: description,
            custom_data: { reference: getReferenceId() },
            return_url: successUrl,
            cancel_url: cancelUrl,
            callback_url: `${BASE_APP_URL}/api/webhooks/paydunya`,
        };
        const { url, error } = await createPayDunyaCheckout(paymentData);
        if (url) return { url, error: null };
        return { url: null, error: error || "Impossible de générer le lien de paiement PayDunya." };
    }

    if (provider === 'genius') {
        try {
            const paymentData = {
                amount: parseInt(finalPrice, 10),
                currency: 'XOF',
                orderId: getReferenceId(),
                description: description,
                payerName: user.displayName || undefined,
                payerEmail: user.email || undefined,
                returnUrl: successUrl,
                cancelUrl: cancelUrl,
                callbackUrl: `${BASE_APP_URL}/api/webhooks/genius`,
            };
            const { data: { payment_url } } = await createGeniusPayment(paymentData);
            if (payment_url) return { url: payment_url, error: null };
            return { url: null, error: "Réponse Genius Pay invalide." };
        } catch (e: any) {
            return { url: null, error: e.message || "Erreur Genius Pay." };
        }
    }

    return { url: null, error: 'Fournisseur de paiement non supporté.' };
}
