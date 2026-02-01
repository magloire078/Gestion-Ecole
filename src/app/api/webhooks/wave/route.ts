
import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { handleSubscriptionPayment, handleTuitionPayment } from '@/services/payment-processing-service';


export async function POST(request: Request) {
  try {
    if (getApps().length === 0) {
      initializeApp();
    }
    const db = getFirestore();
    const body = await request.json();
    console.log("Received Wave Webhook:", body);

    const { type, data } = body;

    if (type !== 'checkout.session.completed' || data?.status !== 'complete') {
        console.log(`Wave event type is "${type}" with status "${data?.status}". Ignoring.`);
        return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    const clientReference = data?.client_reference;
    if (!clientReference) {
        console.error("Wave Webhook: Missing client_reference in payload.");
        return NextResponse.json({ error: "Missing client_reference" }, { status: 400 });
    }

    const parts = clientReference.split('_');
    const paymentType = parts[0];

    if (paymentType === 'tuition' && parts.length >= 4) {
        const schoolId = parts[1];
        const studentId = parts[2];
        const amountPaid = parseInt(data.amount_with_surplus_in_cents, 10) / 100;
        await handleTuitionPayment(db, schoolId, studentId, amountPaid, 'Wave');
    } else if (paymentType === 'subscription' && parts.length >= 4) {
        const schoolId = parts[1];
        const durationStr = parts[3]; // E.g. '12m'
        await handleSubscriptionPayment(db, schoolId, durationStr, 'Wave');
    } else {
        console.warn(`Invalid client_reference format: ${clientReference}. Could not determine payment type.`);
    }

    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("Error processing Wave webhook:", error);
    if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
