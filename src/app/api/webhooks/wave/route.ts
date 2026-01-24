import { NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc, serverTimestamp, getDoc } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { addMonths } from 'date-fns';
import type { school } from '@/lib/data-types';

// Initialize Firebase Admin SDK if not already initialized
// and if the service account is available (to prevent build errors)
if (process.env.FIREBASE_ADMIN_SDK_JSON && !getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON);
  initializeApp({
    credential: cert(serviceAccount)
  });
}

export async function POST(request: Request) {
  try {
    const db = getFirestore();
    const body = await request.json();
    console.log("Received Wave Webhook:", body);

    // TODO: In a production environment, verify the webhook signature.
    // This requires a secret from the Wave Business dashboard.
    // const signature = request.headers.get('wave-signature');
    // const isVerified = verifySignature(signature, body);
    // if (!isVerified) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    
    const { type, data } = body;

    // 1. Check for the successful payment event
    if (type !== 'checkout.session.completed' || data?.status !== 'complete') {
        console.log(`Wave event type is "${type}" with status "${data?.status}". Ignoring.`);
        return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    // 2. Extract schoolId and duration from client_reference
    const clientReference = data?.client_reference;
    if (!clientReference) {
        console.error("Wave Webhook: Missing client_reference in payload.");
        return NextResponse.json({ error: "Missing client_reference" }, { status: 400 });
    }

    const parts = clientReference.split('_');
    if (parts.length < 2) {
        console.error(`Invalid client_reference format: ${clientReference}`);
        return new Response('Invalid client_reference format', { status: 400 });
    }
    const schoolId = parts[0];
    let durationMonths = 1; // Default to 1 month
    if (parts[1] && parts[1].endsWith('m')) {
        const durationStr = parts[1].replace('m', '');
        const parsedDuration = parseInt(durationStr, 10);
        if (!isNaN(parsedDuration) && parsedDuration > 0) {
            durationMonths = parsedDuration;
        }
    }

    console.log(`Processing successful Wave payment for schoolId: ${schoolId} with duration: ${durationMonths} months.`);

    // 3. Update the school document in Firestore
    const schoolRef = doc(db, 'ecoles', schoolId);
    const schoolSnap = await getDoc(schoolRef);

    if (!schoolSnap.exists()) {
        console.error(`School with ID ${schoolId} not found.`);
        return new Response('School not found', { status: 404 });
    }

    const schoolData = schoolSnap.data() as school;
    
    // If subscription is expired or not set, start new subscription from today. Otherwise, extend.
    const currentEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
    const startDate = currentEndDate < new Date() ? new Date() : currentEndDate;
    const newEndDate = addMonths(startDate, durationMonths);

    const subscriptionUpdate = {
        'subscription.status': 'active',
        'subscription.endDate': newEndDate.toISOString(),
        'subscription.updatedAt': serverTimestamp(),
    };

    await updateDoc(schoolRef, subscriptionUpdate);
    
    console.log(`Successfully updated Wave subscription for school ${schoolId}. New end date: ${newEndDate.toISOString()}`);

    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("Error processing Wave webhook:", error);
     // Check for initialization error
    if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
