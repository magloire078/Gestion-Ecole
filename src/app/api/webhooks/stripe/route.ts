import { NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import Stripe from 'stripe';
import { getPlanPrice, type PlanName } from '@/lib/subscription-plans';
import { parsePaymentReference } from '@/lib/payment-reference';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'dummy_secret';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Erreur de signature: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== 'paid') {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const parsed = parsePaymentReference(session.client_reference_id);
  if (!parsed) {
    console.error(`[Stripe Webhook] client_reference_id invalide: ${session.client_reference_id}`);
    return new Response('Invalid client_reference_id', { status: 400 });
  }

  const actualAmount = (session.amount_total || 0) / 100;

  try {
    if (parsed.type === 'tuition') {
      await processTuitionPayment(parsed.schoolId, parsed.studentId, actualAmount, 'Stripe');
    } else {
      try {
        const expectedPriceXOF = getPlanPrice(parsed.planName as PlanName, parsed.durationMonths);
        const XOF_TO_EUR_RATE = 655.957;
        const expectedPriceInCents = Math.round((expectedPriceXOF / XOF_TO_EUR_RATE) * 100);
        const amountPaidCents = session.amount_total || 0;
        if (Math.abs(amountPaidCents - expectedPriceInCents) > 50) {
          console.error(`[Stripe Webhook] Alerte: écart de prix pour l'école ${parsed.schoolId}.`);
        }
      } catch (valErr) {
        console.warn("[Stripe Webhook] Validation prix ignorée:", valErr);
      }
      await processSubscriptionPayment(parsed.schoolId, parsed.planName, parsed.durationMonths, 'Stripe', actualAmount, 'EUR');
    }
  } catch (dbError: any) {
    console.error("[Stripe Webhook] Erreur Firestore:", dbError);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
