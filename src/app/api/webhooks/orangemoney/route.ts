import { NextResponse } from 'next/server';

// Prestataire retiré du produit : GeniusPay est l'unique moyen de paiement.
// Cet endpoint est neutralisé pour ne plus créditer de paiement (réduction
// de la surface d'attaque). Voir src/app/api/webhooks/genius/route.ts.
export async function POST() {
    return NextResponse.json(
        { error: 'Ce prestataire de paiement a été désactivé.' },
        { status: 410 },
    );
}
