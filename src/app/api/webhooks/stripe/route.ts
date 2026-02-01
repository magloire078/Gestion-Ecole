
import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { handleSubscriptionPayment, handleTuitionPayment } from '@/services/payment-processing-service';
import Stripe from 'stripe';

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
    console.error(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
  
  let db;
  try {
    if (getApps().length === 0) {
      initializeApp();
    }
    db = getFirestore();
  } catch (error: any) {
     if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === 'paid') {
      const clientReferenceId = session.client_reference_id;
      if (!clientReferenceId) {
          console.error("Stripe Webhook: Missing client_reference_id in session.");
          return new Response('Missing client_reference_id', { status: 400 });
      }
      
      const parts = clientReferenceId.split('__'); // Using __ as separator
      const paymentType = parts[0];

      try {
        if (paymentType === 'tuition' && parts.length >= 4) {
            const schoolId = parts[1];
            const studentId = parts[2];
            const amountPaid = parseInt(parts[3], 10);
            await handleTuitionPayment(db, schoolId, studentId, amountPaid, 'Stripe');
        } else if (paymentType === 'subscription' && parts.length >= 4) {
            const schoolId = parts[1];
            const durationStr = parts[3];
            await handleSubscriptionPayment(db, schoolId, durationStr, 'Stripe');
        } else {
             console.warn(`Stripe Webhook: Could not parse client_reference_id: ${clientReferenceId}`);
        }
      } catch (dbError: any) {
          console.error("Firestore update failed:", dbError);
          return NextResponse.json({ error: "Database update failed", details: dbError.message }, { status: 500 });
      }
    }
  } else {
    console.warn(`Unhandled event type ${event.type}`);
  }

  return new Response(null, { status: 200 });
}
