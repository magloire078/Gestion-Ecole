
import { NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { addMonths } from 'date-fns';

// Initialisez Firebase Admin SDK s'il n'est pas déjà initialisé
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON || '{}');

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received Orange Money IPN:", JSON.stringify(body, null, 2));

    const { status, reference, amount } = body;

    // 1. Vérifier le statut du paiement
    if (status !== 'SUCCESS') {
        console.log(`Payment status is ${status}. Ignoring.`);
        return NextResponse.json({ message: "Notification received, status not SUCCESS" }, { status: 200 });
    }

    // 2. Extraire la référence (qui doit être le schoolId)
    const schoolId = reference;
    if (!schoolId) {
        console.error("Error: 'reference' (schoolId) is missing in the Orange Money IPN body.");
        return NextResponse.json({ error: "Reference (schoolId) missing" }, { status: 400 });
    }

    console.log(`Processing successful payment for schoolId: ${schoolId}`);

    // 3. Mettre à jour le document de l'école dans Firestore
    // NOTE: C'est une solution de secours. La logique principale est maintenant sur la page de succès.
    // Cette partie ne connaît pas la durée choisie par l'utilisateur, on applique une durée par défaut.
    const schoolRef = doc(db, 'ecoles', schoolId);
    
    // On assume 1 mois par défaut car on ne peut pas deviner la durée ici.
    const newEndDate = addMonths(new Date(), 1);

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
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
