
import { NextResponse } from 'next/server';
import {
    processSubscriptionPayment,
    processTuitionPayment,
    reverseTuitionPayment,
    logPaymentFailure,
} from '@/lib/payment-processing';
import Stripe from 'stripe';
import { getPlanPrice, PlanName } from '@/lib/subscription-plans';
import { XOF_TO_EUR_RATE } from '@/lib/stripe';
import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'dummy_secret';

/**
 * Idempotency guard: Stripe can redeliver the same event. We record processed
 * event IDs in Firestore and short-circuit if we have already handled one.
 * Returns true if the event was newly claimed (caller should process it).
 */
async function claimEvent(eventId: string): Promise<boolean> {
    const ref = getAdminDb().collection('processedWebhooks').doc(`stripe_${eventId}`);
    try {
        await ref.create({
            provider: 'stripe',
            eventId,
            processedAt: FieldValue.serverTimestamp(),
        });
        return true;
    } catch (err: any) {
        if (err?.code === 6 /* ALREADY_EXISTS */ || String(err?.message || '').includes('already exists')) {
            return false;
        }
        throw err;
    }
}

function parseReference(ref: string | null | undefined) {
    if (!ref) return null;
    const parts = ref.split('__');
    if (parts.length < 3) return null;
    return {
        type: parts[0] as 'tuition' | 'subscription',
        schoolId: parts[1],
        studentIdOrDuration: parts[2],
        amount: parts[3] ? parseFloat(parts[3]) : undefined,
    };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') {
        console.log(`[Stripe Webhook] Session ${session.id} not paid (status=${session.payment_status}), skipping.`);
        return;
    }

    const meta = session.metadata || {};
    const parsed = parseReference(session.client_reference_id);
    const type = (meta.type as 'tuition' | 'subscription') || parsed?.type;
    const schoolId = meta.schoolId || parsed?.schoolId;

    if (!type || !schoolId) {
        console.error('[Stripe Webhook] Missing type/schoolId in session', session.id);
        throw new Error('Missing payment context');
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    const providerRef = {
        provider: 'Stripe' as const,
        sessionId: session.id,
        paymentIntentId,
    };

    if (type === 'tuition') {
        const studentId = meta.studentId || parsed?.studentIdOrDuration;
        if (!studentId) throw new Error('Missing studentId');

        const actualAmountEUR = (session.amount_total || 0) / 100;
        const amountXOF = meta.amountXOF
            ? parseFloat(meta.amountXOF)
            : Math.round(actualAmountEUR * XOF_TO_EUR_RATE);

        await processTuitionPayment(schoolId, studentId, amountXOF, providerRef);
        console.log(`[Stripe Webhook] Tuition processed for student ${studentId} (${amountXOF} XOF)`);
        return;
    }

    if (type === 'subscription') {
        const planName = meta.planName || 'Abonnement';
        const durationMonths = meta.durationMonths
            ? parseInt(meta.durationMonths, 10)
            : parseInt(String(parsed?.studentIdOrDuration || '1').replace('m', ''), 10) || 1;

        // Price validation: ensure the amount paid matches the advertised plan price.
        const amountPaidCents = session.amount_total || 0;
        try {
            const expectedPriceXOF = getPlanPrice(planName as PlanName, durationMonths);
            const expectedPriceInCents = Math.round((expectedPriceXOF / XOF_TO_EUR_RATE) * 100);
            // Tolerance: 1% or 50 cents, whichever is larger (FX rounding).
            const tolerance = Math.max(50, Math.round(expectedPriceInCents * 0.01));
            if (Math.abs(amountPaidCents - expectedPriceInCents) > tolerance) {
                console.error(
                    `[Stripe Webhook] PRICE MISMATCH for school ${schoolId}: paid=${amountPaidCents}c expected=${expectedPriceInCents}c`
                );
                throw new Error('Payment amount mismatch');
            }
        } catch (valErr: any) {
            // Plan lookup failed — continue but log; do not silently activate.
            if (valErr.message === 'Payment amount mismatch') throw valErr;
            console.warn('[Stripe Webhook] Plan price validation skipped:', valErr?.message);
        }

        await processSubscriptionPayment(schoolId, planName, durationMonths, providerRef);
        console.log(`[Stripe Webhook] Subscription ${planName} activated for school ${schoolId}`);
    }
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
    const meta = intent.metadata || {};
    const parsed = parseReference(meta.clientReferenceId);
    const schoolId = meta.schoolId || parsed?.schoolId;
    if (!schoolId) {
        console.warn('[Stripe Webhook] payment_intent.payment_failed without schoolId', intent.id);
        return;
    }

    await logPaymentFailure(schoolId, {
        provider: 'Stripe',
        paymentIntentId: intent.id,
        type: (meta.type as 'tuition' | 'subscription') || 'subscription',
        studentId: meta.studentId,
        amount: intent.amount / 100,
        currency: intent.currency,
        errorCode: intent.last_payment_error?.code,
        errorMessage: intent.last_payment_error?.message,
    });
    console.log(`[Stripe Webhook] Payment failure logged for school ${schoolId} (intent=${intent.id})`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
    const meta = charge.metadata || {};
    const schoolId = meta.schoolId;
    const type = meta.type as 'tuition' | 'subscription' | undefined;

    if (!schoolId || type !== 'tuition') {
        console.log(`[Stripe Webhook] Refund ignored (type=${type}, schoolId=${schoolId})`);
        return;
    }

    const studentId = meta.studentId;
    if (!studentId) {
        console.warn('[Stripe Webhook] Tuition refund missing studentId', charge.id);
        return;
    }

    const amountRefundedCents = charge.amount_refunded || 0;
    const amountEUR = amountRefundedCents / 100;
    const amountXOF = meta.amountXOF
        ? parseFloat(meta.amountXOF) * (amountRefundedCents / (charge.amount || 1))
        : Math.round(amountEUR * XOF_TO_EUR_RATE);

    await reverseTuitionPayment(schoolId, studentId, amountXOF, {
        provider: 'Stripe',
        paymentIntentId: typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id,
        refundId: charge.refunds?.data?.[0]?.id,
    });
    console.log(`[Stripe Webhook] Refund processed for student ${studentId} (${amountXOF} XOF)`);
}

export async function POST(request: Request) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`[Stripe Webhook] Signature error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Idempotency: skip if we've already processed this event.
    const claimed = await claimEvent(event.id);
    if (!claimed) {
        console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping.`);
        return NextResponse.json({ received: true, duplicate: true });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
                break;

            case 'charge.refunded':
                await handleChargeRefunded(event.data.object as Stripe.Charge);
                break;

            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
    } catch (err: any) {
        console.error(`[Stripe Webhook] Processing error for ${event.id}:`, err);
        // Release the claim so Stripe's retry can succeed.
        await getAdminDb().collection('processedWebhooks').doc(`stripe_${event.id}`).delete().catch(() => {});
        return NextResponse.json({ error: err.message || 'Processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
