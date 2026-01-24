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
    console.log("Received MTN MoMo IPN:", JSON.stringify(body, null, 2));

    // TODO: Ideally, verify the IPN source via signature check if provided by MTN.
    
    const { status, externalId } = body;
    if (!status || !externalId) {
        console.error("MTN MoMo IPN: Missing required fields (status, externalId).");
        return new Response('Missing required fields', { status: 400 });
    }

    // 1. Verify payment status
    if (status !== 'SUCCESSFUL') {
        console.log(`MTN MoMo payment status is ${status}. Ignoring.`);
        return new Response(null, { status: 200 }); // OK, but not processing further
    }

    // 2. Extract information from externalId
    // Expected format: "schoolId_durationM_timestamp"
    const parts = externalId.split('_');
    if (parts.length < 2) {
        console.error(`Invalid externalId format: ${externalId}`);
        return new Response('Invalid externalId format', { status: 400 });
    }
    const schoolId = parts[0];
    let durationMonths = 1; // Default duration
    if (parts[1].endsWith('m')) {
        const durationStr = parts[1].replace('m', '');
        const parsedDuration = parseInt(durationStr, 10);
        if (!isNaN(parsedDuration) && parsedDuration > 0) {
            durationMonths = parsedDuration;
        }
    }
    
    console.log(`Processing successful MTN payment for schoolId: ${schoolId} with duration: ${durationMonths} months.`);

    // 3. Update the school document in Firestore
    const schoolRef = doc(db, 'ecoles', schoolId);
    const schoolSnap = await getDoc(schoolRef);

    if (!schoolSnap.exists()) {
        console.error(`School with ID ${schoolId} not found.`);
        return new Response('School not found', { status: 404 });
    }

    const schoolData = schoolSnap.data() as school;
    // If subscription is expired, start new subscription from today. Otherwise, extend.
    const subEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
    const startDate = subEndDate < new Date() ? new Date() : subEndDate;
    const newEndDate = addMonths(startDate, durationMonths);

    await updateDoc(schoolRef, {
        'subscription.status': 'active',
        'subscription.endDate': newEndDate.toISOString(),
        'subscription.updatedAt': serverTimestamp(),
    });
    
    console.log(`Successfully updated subscription for school ${schoolId}. New end date: ${newEndDate.toISOString()}`);
    
    // According to MTN docs, respond quickly with a 200 OK.
    return new Response(null, { status: 200 });

  } catch (error: any) {
    console.error("Error processing MTN MoMo IPN:", error);
    // Check for initialization error
    if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
