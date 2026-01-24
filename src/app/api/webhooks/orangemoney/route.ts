
import { NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc, serverTimestamp, getDoc } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { addMonths } from 'date-fns';
import type { school } from '@/lib/data-types';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp();
}

export async function POST(request: Request) {
  try {
    const db = getFirestore();
    const body = await request.json();
    console.log("Received Orange Money IPN:", JSON.stringify(body, null, 2));

    // Sécurité basique : Vérifier que le corps contient les champs attendus
    const { status, order_id, reference } = body;
    if (!status || !order_id || !reference) {
      console.error("Orange Money IPN: Missing required fields.");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 1. Vérifier le statut du paiement
    if (status !== 'SUCCESS') {
        console.log(`Payment status is ${status}. Ignoring.`);
        return NextResponse.json({}, { status: 200 }); // OK pour Orange Money
    }

    // 2. Extraire les informations de l'order_id
    // Format attendu : "schoolId_durationM_timestamp"
    const schoolId = reference; // La référence principale est l'ID de l'école
    const parts = order_id.split('_');
    
    let durationMonths = 1; // Durée par défaut si non trouvée
    if (parts.length >= 2 && parts[1].endsWith('m')) {
        const durationStr = parts[1].replace('m', '');
        const parsedDuration = parseInt(durationStr, 10);
        if (!isNaN(parsedDuration) && parsedDuration > 0) {
            durationMonths = parsedDuration;
        }
    }
    console.log(`Processing successful payment for schoolId: ${schoolId} with duration: ${durationMonths} months.`);

    // 3. Mettre à jour le document de l'école dans Firestore
    const schoolRef = doc(db, 'ecoles', schoolId);
    const schoolSnap = await getDoc(schoolRef);

    if (!schoolSnap.exists()) {
        console.error(`School with ID ${schoolId} not found.`);
        return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const schoolData = schoolSnap.data() as school;
    
    // If subscription is expired, start new subscription from today. Otherwise, extend.
    const subEndDate = schoolData.subscription?.endDate ? new Date(schoolData.subscription.endDate) : new Date();
    const startDate = subEndDate < new Date() ? new Date() : subEndDate;
    const newEndDate = addMonths(startDate, durationMonths);

    const subscriptionUpdate = {
        'subscription.status': 'active',
        'subscription.endDate': newEndDate.toISOString(),
        'subscription.updatedAt': serverTimestamp(),
    };

    await updateDoc(schoolRef, subscriptionUpdate);
    
    console.log(`Successfully updated subscription for school ${schoolId}. New end date: ${newEndDate.toISOString()}`);
    
    // L'API Orange Money attend une réponse JSON vide avec un statut 200 OK.
    return NextResponse.json({}, { status: 200 });
    
  } catch (error: any) {
    console.error("Error processing Orange Money IPN:", error);
     // Check for initialization error
    if (error.message.includes("The default Firebase app does not exist")) {
        return NextResponse.json({ error: "Server configuration error. Firebase Admin not initialized." }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
