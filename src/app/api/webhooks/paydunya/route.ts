
import { NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc, serverTimestamp, getDoc } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { addMonths } from 'date-fns';
import type { school } from '@/lib/data-types';

export async function POST(request: Request) {
  try {
    if (getApps().length === 0) {
      initializeApp();
    }
    const db = getFirestore();
    const body = await request.json();
    console.log("Received PayDunya IPN:", JSON.stringify(body, null, 2));

    // TODO: Verify PayDunya-Signature if a secret is provided.

    const { data } = body;

    // 1. Verify payment status
    if (data?.status !== 'completed') {
        console.log(`PayDunya payment status is ${data?.status}. Ignoring.`);
        return new Response(null, { status: 200 }); // OK, but not processing further
    }
    
    // 2. Extract information from custom_data
    const customData = data.custom_data;
    if (!customData || !customData.reference) {
         console.error("PayDunya IPN: Missing custom_data.reference in payload.");
        return new Response('Missing custom_data.reference', { status: 400 });
    }
    
    // Expected format: "schoolId_durationM_timestamp"
    const parts = customData.reference.split('_');
    if (parts.length < 2) {
        console.error(`Invalid custom_data.reference format: ${customData.reference}`);
        return new Response('Invalid custom_data.reference format', { status: 400 });
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

    console.log(`Processing successful PayDunya payment for schoolId: ${schoolId} with duration: ${durationMonths} months.`);

    // 3. Update the school document in Firestore
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

    await updateDoc(schoolRef, {
        'subscription.status': 'active',
        'subscription.endDate': newEndDate.toISOString(),
        'subscription.updatedAt': serverTimestamp(),
    });
    
    console.log(`Successfully updated subscription for school ${schoolId}. New end date: ${newEndDate.toISOString()}`);
    
    // PayDunya expects a 200 OK.
    return new Response(null, { status: 200 });

  } catch (error: any) {
    console.error("Error processing PayDunya IPN:", error);
    if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
