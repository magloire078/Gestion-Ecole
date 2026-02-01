
import { NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc, serverTimestamp, getDoc, writeBatch, collection, type Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { addMonths } from 'date-fns';
import type { school, student } from '@/lib/data-types';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function handleSubscriptionPayment(db: Firestore, schoolId: string, durationStr: string, paymentProvider: string) {
    const durationMonths = parseInt(durationStr.replace('m', ''), 10) || 1;
    console.log(`Processing ${paymentProvider} subscription for schoolId: ${schoolId}, duration: ${durationMonths} months.`);

    const schoolRef = doc(db, 'ecoles', schoolId);
    const schoolSnap = await getDoc(schoolRef);

    if (!schoolSnap.exists()) {
        console.error(`[${paymentProvider}] School with ID ${schoolId} not found.`);
        throw new Error('School not found');
    }

    const schoolData = schoolSnap.data() as school;
    const subEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
    const startDate = subEndDate < new Date() ? new Date() : subEndDate;
    const newEndDate = addMonths(startDate, durationMonths);

    await updateDoc(schoolRef, {
        'subscription.status': 'active',
        'subscription.endDate': newEndDate.toISOString(),
        'updatedAt': serverTimestamp(),
    });
    console.log(`[${paymentProvider}] Successfully updated subscription for school ${schoolId}.`);
}


async function handleTuitionPayment(db: Firestore, schoolId: string, studentId: string, amountPaid: number, paymentProvider: string) {
    console.log(`Processing ${paymentProvider} tuition payment for schoolId: ${schoolId}, studentId: ${studentId}, amount: ${amountPaid}`);

    const studentRef = doc(db, `ecoles/${schoolId}/eleves/${studentId}`);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        console.error(`[${paymentProvider}] Student with ID ${studentId} in school ${schoolId} not found.`);
        throw new Error('Student not found');
    }
    
    const studentData = studentSnap.data() as student;
    const newAmountDue = Math.max(0, (studentData.amountDue || 0) - amountPaid);
    const newStatus = newAmountDue <= 0 ? 'Soldé' : 'Partiel';
    
    const batch = writeBatch(db);
    
    batch.update(studentRef, { amountDue: newAmountDue, tuitionStatus: newStatus });

    const accountingRef = doc(collection(db, `ecoles/${schoolId}/comptabilite`));
    batch.set(accountingRef, {
        schoolId, studentId, date: new Date().toISOString().split('T')[0],
        description: `Paiement scolarité via ${paymentProvider}`, category: 'Scolarité', type: 'Revenu', amount: amountPaid
    });

    const paymentRef = doc(collection(db, `ecoles/${schoolId}/eleves/${studentId}/paiements`));
    batch.set(paymentRef, {
        schoolId, studentId, date: new Date().toISOString().split('T')[0], amount: amountPaid,
        description: `Paiement en ligne via ${paymentProvider}`, accountingTransactionId: accountingRef.id,
        payerFirstName: studentData.parent1FirstName || 'Parent', payerLastName: studentData.parent1LastName || '',
        method: paymentProvider === 'Stripe' ? 'Carte Bancaire' : 'Paiement Mobile'
    });
    
    await batch.commit();
    console.log(`[${paymentProvider}] Successfully updated tuition for student ${studentId}.`);
}


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
