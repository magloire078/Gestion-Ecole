
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
    console.log("Received Orange Money IPN:", JSON.stringify(body, null, 2));

    const { status, order_id, amount } = body;
    if (!status || !order_id || !amount) {
      console.error("Orange Money IPN: Missing required fields.");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (status !== 'SUCCESS') {
        console.log(`Payment status is ${status}. Ignoring.`);
        return NextResponse.json({}, { status: 200 });
    }
    
    const parts = order_id.split('_');
    const paymentType = parts[0];

    if (paymentType === 'tuition' && parts.length >= 4) {
        const schoolId = parts[1];
        const studentId = parts[2];
        await handleTuitionPayment(db, schoolId, studentId, parseInt(amount, 10), 'Orange Money');
    } else if (paymentType === 'subscription' && parts.length >= 4) {
        const schoolId = parts[1];
        const durationStr = parts[3];
        await handleSubscriptionPayment(db, schoolId, durationStr, 'Orange Money');
    } else {
        console.warn(`Invalid order_id format: ${order_id}. Could not determine payment type.`);
    }
    
    return NextResponse.json({}, { status: 200 });
    
  } catch (error: any) {
    console.error("Error processing Orange Money IPN:", error);
    if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
