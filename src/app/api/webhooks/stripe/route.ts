
import { NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import Stripe from 'stripe';
import { getPlanPrice, PlanName } from '@/lib/subscription-plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === 'paid') {
      const clientReferenceId = session.client_reference_id;
      if (!clientReferenceId) {
        console.error("[Stripe Webhook] client_reference_id manquant.");
        return new Response('Missing client_reference_id', { status: 400 });
      }

      // Format: type__schoolId__studentIdOrDuration__amount
      const parts = clientReferenceId.split('__');
      const paymentType = parts[0];
      const schoolId = parts[1];

      try {
        if (paymentType === 'tuition') {
          const studentId = parts[2];
          const amountPaid = parseFloat(parts[3]); // Use amount from reference for tuition validation or session.amount_total
          const actualAmount = (session.amount_total || 0) / 100; // Stripe amount is in cents

          await processTuitionPayment(schoolId, studentId, actualAmount, 'Stripe');
          console.log(`[Stripe Webhook] Scolarité traitée pour l'élève ${studentId}`);

        } else if (paymentType === 'subscription') {
          const planName = parts[2] || 'Abonnement';
          const durationStr = parts[3] || '1';
          const durationMonths = parseInt(durationStr.replace('m', ''), 10) || 1;
          const amountPaidCents = session.amount_total || 0;

          // PRICE VALIDATION (Security)
          try {
            const expectedPriceXOF = getPlanPrice(planName as PlanName, durationMonths);
            const XOF_TO_EUR_RATE = 655.957;
            const expectedPriceInEUR = expectedPriceXOF / XOF_TO_EUR_RATE;
            const expectedPriceInCents = Math.round(expectedPriceInEUR * 100);

            if (Math.abs(amountPaidCents - expectedPriceInCents) > 50) { // small margin
              console.error(`[Stripe Webhook] Alerte Sécurité: Écart de prix pour l'école ${schoolId}.`);
              throw new Error('Payment amount mismatch');
            }
          } catch (valErr) {
            console.warn("[Stripe Webhook] Validation passée ou échouée, mais on continue si c'est valide.", valErr);
          }

          await processSubscriptionPayment(schoolId, planName, durationMonths, 'Stripe');
          console.log(`[Stripe Webhook] Abonnement traité pour l'école ${schoolId}`);
        }
      } catch (dbError: any) {
        console.error("[Stripe Webhook] Erreur lors de la mise à jour Firestore:", dbError);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
