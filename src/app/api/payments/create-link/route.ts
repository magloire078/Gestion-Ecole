
import { NextResponse } from 'next/server';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createWaveCheckoutSession } from '@/lib/wave';
import { createPayDunyaCheckout } from '@/lib/paydunya';
import { getOrangeMoneyPaymentLink } from '@/lib/orange-money';
import { requestMtnMomoPayment, MTN_CURRENCY } from '@/lib/mtn-momo';
import { createGeniusPayment } from '@/lib/genius-pay';
import { buildPaymentReference } from '@/lib/payment-reference';
import type { PlanName } from '@/lib/subscription-plans';

function resolveBaseUrl(req: Request): string {
    const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (env) return env.replace(/\/$/, '');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const host = forwardedHost || req.headers.get('host');
    if (host) {
        const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
        return `${proto}://${host}`;
    }
    try {
        return new URL(req.url).origin;
    } catch {
        return 'http://localhost:3000';
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            provider,
            type,
            schoolId,
            studentId,
            amount: rawAmount,
            duration,
            planName,
            userEmail,
            userDisplayName,
            phone,
        } = body;

        console.log("[CreateLinkAPI] Received body:", { provider, type, schoolId, rawAmount, planName });

        const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : rawAmount;

        if (!provider || !type || !schoolId || !amount) {
            console.error("[CreateLinkAPI] Validation failed. Missing params:", { 
                hasProvider: !!provider, 
                hasType: !!type, 
                hasSchoolId: !!schoolId, 
                hasAmount: !!amount,
                amountValue: amount 
            });
            return NextResponse.json({ error: "Paramètres manquants ou invalides (le montant doit être supérieur à 0)." }, { status: 400 });
        }

        const BASE_URL = resolveBaseUrl(req);

        if (type === 'subscription' && !planName) {
            return NextResponse.json({ error: "Nom de plan requis pour un abonnement." }, { status: 400 });
        }
        if (type === 'tuition' && !studentId) {
            return NextResponse.json({ error: "studentId requis pour une scolarité." }, { status: 400 });
        }

        const referenceValue = type === 'tuition'
            ? buildPaymentReference({ type: 'tuition', schoolId, studentId, amount })
            : buildPaymentReference({
                type: 'subscription',
                schoolId,
                planName: planName as PlanName,
                durationMonths: parseInt(String(duration || '1').replace('m', ''), 10) || 1,
                amount,
            });

        const successUrl = `${BASE_URL}/payment/success?type=${type}`;
        const errorUrl = (psp: string) => `${BASE_URL}/payment/error?type=${type}&provider=${psp}${planName ? `&plan=${encodeURIComponent(planName)}` : ''}`;

        switch (provider.toLowerCase()) {
            case 'stripe':
                const stripeResult = await createStripeCheckoutSession({
                    priceInCents: Math.round(amount * 100),
                    planName: type === 'tuition' ? 'Frais de Scolarité' : planName || 'Abonnement',
                    description: type === 'tuition' ? `Paiement scolarité élève ID: ${studentId}` : `Abonnement école ${schoolId}`,
                    clientReferenceId: referenceValue,
                    customerEmail: userEmail,
                    successUrl: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: errorUrl('stripe'),
                });
                if (stripeResult.error) return NextResponse.json({ error: stripeResult.error }, { status: 500 });
                return NextResponse.json({ url: stripeResult.url });

            case 'wave':
                const waveUrl = await createWaveCheckoutSession({
                    amount: amount.toString(),
                    currency: 'XOF',
                    error_url: errorUrl('wave'),
                    success_url: successUrl,
                    client_reference: referenceValue,
                });
                return NextResponse.json({ url: waveUrl });

            case 'genius':
                const geniusResult = await createGeniusPayment({
                    amount: amount,
                    currency: 'XOF',
                    description: type === 'tuition' ? `Scolarité student_${studentId}` : `Abonnement school_${schoolId}`,
                    orderId: referenceValue,
                    payerName: userDisplayName || 'Client GèreEcole',
                    payerEmail: userEmail,
                    payerPhone: phone,
                    successUrl,
                    errorUrl: errorUrl('genius'),
                    metadata: {
                        type,
                        schoolId,
                        studentId: studentId || '',
                        duration: duration || ''
                    }
                });
                return NextResponse.json({ url: geniusResult.data.payment_url });

            case 'paydunya':
                const paydunyaResult = await createPayDunyaCheckout({
                    total_amount: amount,
                    description: type === 'tuition' ? `Scolarité ${studentId}` : `Abonnement ${duration} mois`,
                    custom_data: { reference: referenceValue },
                    return_url: successUrl,
                    cancel_url: errorUrl('paydunya'),
                    callback_url: `${BASE_URL}/api/webhooks/paydunya`,
                });
                return NextResponse.json({ url: paydunyaResult.url, error: paydunyaResult.error });

            case 'orange':
            case 'orangemoney':
                const orangeUrl = await getOrangeMoneyPaymentLink({
                    merchant_key: process.env.ORANGE_MONEY_MERCHANT_KEY || '',
                    currency: 'XOF',
                    order_id: `OM_${Date.now()}`,
                    amount: amount,
                    return_url: successUrl,
                    cancel_url: errorUrl('orangemoney'),
                    notif_url: `${BASE_URL}/api/webhooks/orangemoney`,
                    lang: 'fr',
                    reference: referenceValue,
                });
                return NextResponse.json({ url: orangeUrl });

            case 'mtn':
                const mtnResult = await requestMtnMomoPayment({
                    amount: amount.toString(),
                    currency: MTN_CURRENCY,
                    externalId: referenceValue,
                    payer: {
                        partyIdType: 'MSISDN',
                        partyId: phone || '',
                    },
                    payerMessage: "Paiement GèreEcole",
                    payeeNote: type === 'tuition' ? "Scolarité" : "Abonnement",
                });
                // MTN doesn't return a URL, it's a push request.
                return NextResponse.json({
                    success: mtnResult.success,
                    message: mtnResult.message,
                    url: mtnResult.success ? `${BASE_URL}/payment/pending?type=${type}` : null
                });

            default:
                return NextResponse.json({ error: "Fournisseur de paiement non supporté." }, { status: 400 });
        }
    } catch (error: any) {
        console.error("[CreateLinkAPI] Error:", error);
        return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}
