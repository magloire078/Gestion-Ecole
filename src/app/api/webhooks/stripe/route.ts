
import { NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc, serverTimestamp, getDoc } from 'firebase-admin/firestore';
import { initializeApp, getApps, App as AdminApp } from 'firebase-admin/app';
import { addMonths } from 'date-fns';
import type { school } from '@/lib/data-types';
import Stripe from 'stripe';

// Initialize Stripe
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


  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;

      // Check if payment was successful
      if (session.payment_status === 'paid') {
        const clientReferenceId = session.client_reference_id;
        if (!clientReferenceId) {
            console.error("Stripe Webhook: Missing client_reference_id in session.");
            return new Response('Missing client_reference_id', { status: 400 });
        }
        
        // Extract schoolId and duration from client_reference_id (format: "schoolId__duration")
        const [schoolId, durationStr] = clientReferenceId.split('__');
        const durationMonths = parseInt(durationStr || '1', 10);

        if (!schoolId) {
            console.error(`Invalid client_reference_id format: ${clientReferenceId}`);
            return new Response('Invalid client_reference_id format', { status: 400 });
        }

        console.log(`Processing successful Stripe payment for schoolId: ${schoolId} with duration: ${durationMonths} months.`);

        try {
            const schoolRef = doc(db, 'ecoles', schoolId);
            const schoolSnap = await getDoc(schoolRef);

            if (!schoolSnap.exists()) {
                console.error(`School with ID ${schoolId} not found.`);
                return new Response('School not found', { status: 404 });
            }

            const schoolData = schoolSnap.data() as school;
            
            const subEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
            const startDate = subEndDate < new Date() ? new Date() : subEndDate;
            const newEndDate = addMonths(startDate, durationMonths);

            const subscriptionUpdate = {
                'subscription.status': 'active',
                'subscription.endDate': newEndDate.toISOString(),
                'subscription.updatedAt': serverTimestamp(),
            };

            await updateDoc(schoolRef, subscriptionUpdate);
            
            console.log(`Successfully updated Stripe subscription for school ${schoolId}. New end date: ${newEndDate.toISOString()}`);

        } catch (dbError: any) {
            console.error("Firestore update failed:", dbError);
            return NextResponse.json({ error: "Database update failed", details: dbError.message }, { status: 500 });
        }
      }
      break;
    default:
      console.warn(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  return new Response(null, { status: 200 });
}
