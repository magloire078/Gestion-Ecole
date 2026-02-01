
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
    console.log("Received MTN MoMo IPN:", JSON.stringify(body, null, 2));
    
    const { status, externalId, amount } = body;
    if (!status || !externalId) {
        console.error("MTN MoMo IPN: Missing required fields (status, externalId).");
        return new Response('Missing required fields', { status: 400 });
    }

    if (status !== 'SUCCESSFUL') {
        console.log(`MTN MoMo payment status is ${status}. Ignoring.`);
        return new Response(null, { status: 200 });
    }
    
    const parts = externalId.split('_');
    const paymentType = parts[0];

    if (paymentType === 'tuition' && parts.length >= 4) {
        const schoolId = parts[1];
        const studentId = parts[2];
        const amountPaid = parseInt(amount, 10);
        await handleTuitionPayment(db, schoolId, studentId, amountPaid, 'MTN MoMo');
    } else if (paymentType === 'subscription' && parts.length >= 4) {
        const schoolId = parts[1];
        const durationStr = parts[3];
        await handleSubscriptionPayment(db, schoolId, durationStr, 'MTN MoMo');
    } else {
        console.warn(`Invalid externalId format: ${externalId}. Could not determine payment type.`);
    }
    
    return new Response(null, { status: 200 });

  } catch (error: any) {
    console.error("Error processing MTN MoMo IPN:", error);
    if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
