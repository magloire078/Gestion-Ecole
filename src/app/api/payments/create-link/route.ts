
import { NextResponse } from 'next/server';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { createWaveCheckoutSession } from '@/lib/wave';
import { createPayDunyaCheckout } from '@/lib/paydunya';
import { getOrangeMoneyPaymentLink } from '@/lib/orange-money';
import { requestMtnMomoPayment } from '@/lib/mtn-momo';
import { createGeniusPayment } from '@/lib/genius-pay';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            provider,
            type, // 'subscription' or 'tuition'
            schoolId,
            studentId,
            amount,
            duration, // for subscription (e.g. '1', '12')
            planName, // for subscription
            userEmail,
            userDisplayName,
            phone, // for mobile payments
        } = body;

        if (!provider || !type || !schoolId || !amount) {
            return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
        }

        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // Construct reference for webhooks
        // Format: type__schoolId__studentIdOrDuration__amount
        const referenceValue = type === 'tuition'
            ? `tuition__${schoolId}__${studentId}__${amount}`
            : `subscription__${schoolId}__${duration}__${amount}`;

        switch (provider.toLowerCase()) {
            case 'stripe':
                const stripeResult = await createStripeCheckoutSession({
                    priceInCents: amount * 100,
                    planName: type === 'tuition' ? 'Frais de Scolarité' : planName || 'Abonnement',
                    description: type === 'tuition' ? `Paiement scolarité élève ID: ${studentId}` : `Abonnement école ${schoolId}`,
                    clientReferenceId: referenceValue,
                    customerEmail: userEmail,
                });
                if (stripeResult.error) return NextResponse.json({ error: stripeResult.error }, { status: 500 });
                return NextResponse.json({ url: stripeResult.url });

            case 'wave':
                const waveUrl = await createWaveCheckoutSession({
                    amount: amount.toString(),
                    currency: 'XOF',
                    error_url: `${BASE_URL}/payment/error`,
                    success_url: `${BASE_URL}/payment/success`,
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
                    successUrl: `${BASE_URL}/payment/success`,
                    errorUrl: `${BASE_URL}/payment/error`,
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
                    return_url: `${BASE_URL}/payment/success`,
                    cancel_url: `${BASE_URL}/payment/error`,
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
                    return_url: `${BASE_URL}/payment/success`,
                    cancel_url: `${BASE_URL}/payment/error`,
                    notif_url: `${BASE_URL}/api/webhooks/orange`,
                    lang: 'fr',
                    reference: referenceValue,
                });
                return NextResponse.json({ url: orangeUrl });

            case 'mtn':
                const mtnResult = await requestMtnMomoPayment({
                    amount: amount.toString(),
                    currency: 'EUR', // Per sandbox config in mtn-momo.ts
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
                    url: mtnResult.success ? `${BASE_URL}/payment/pending` : null
                });

            default:
                return NextResponse.json({ error: "Fournisseur de paiement non supporté." }, { status: 400 });
        }
    } catch (error: any) {
        console.error("[CreateLinkAPI] Error:", error);
        return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
}
