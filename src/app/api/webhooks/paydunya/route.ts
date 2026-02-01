
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
    console.log("Received PayDunya IPN:", JSON.stringify(body, null, 2));

    const { data } = body;

    if (data?.status !== 'completed') {
        console.log(`PayDunya payment status is ${data?.status}. Ignoring.`);
        return new Response(null, { status: 200 });
    }
    
    const customData = data.custom_data;
    if (!customData || !customData.reference) {
         console.error("PayDunya IPN: Missing custom_data.reference in payload.");
        return new Response('Missing custom_data.reference', { status: 400 });
    }
    
    const parts = customData.reference.split('_');
    const paymentType = parts[0];

    if (paymentType === 'tuition' && parts.length >= 4) {
        const schoolId = parts[1];
        const studentId = parts[2];
        const amountPaid = parseInt(data.invoice.total_amount, 10);
        await handleTuitionPayment(db, schoolId, studentId, amountPaid, 'PayDunya');
    } else if (paymentType === 'subscription' && parts.length >= 4) {
        const schoolId = parts[1];
        const durationStr = parts[3];
        await handleSubscriptionPayment(db, schoolId, durationStr, 'PayDunya');
    } else {
        console.warn(`Invalid custom_data.reference format: ${customData.reference}. Could not determine payment type.`);
    }

    return new Response(null, { status: 200 });

  } catch (error: any) {
    console.error("Error processing PayDunya IPN:", error);
    if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
