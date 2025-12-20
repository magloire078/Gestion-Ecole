
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received PayDunya IPN:", body);

    // TODO:
    // 1. Vérifier l'authenticité de la requête (PayDunya envoie un header 'Paydunya-Signature').
    // 2. Vérifier le statut de l'événement (ex: body.data.status === 'completed').
    // 3. Utiliser `body.data.custom_data` pour retrouver la transaction dans votre base de données.
    // 4. Mettre à jour le statut de l'abonnement de l'école.
    
    // PayDunya attend une réponse 200 OK pour accuser réception.
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing PayDunya IPN:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
