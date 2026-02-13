import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
// Assurez-vous que @/firebase/admin est correctement configuré pour l'accès admin Firestore
// Si ce fichier n'existe pas, nous devrons le créer ou utiliser une autre méthode d'accès.
import { verifyGeniusPayment } from '@/lib/genius-pay';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { transaction_id, order_id, status } = body;

        console.log(`[Genius Webhook] Notification reçue pour Transaction: ${transaction_id}, Order: ${order_id}, Status: ${status}`);

        // Vérification de sécurité (optionnelle mais recommandée : appeler l'API pour confirmer le statut)
        // const verifiedData = await verifyGeniusPayment(transaction_id);
        // if (verifiedData.status !== 'SUCCESS') { ... }

        if (status === 'SUCCESS' || status === 'COMPLETED') { // Vérifier les statuts exacts de Genius Pay

            // Analyser l'order_id pour savoir quoi mettre à jour
            const parts = order_id.split('_');
            const type = parts[0]; // 'subscription' ou 'tuition' ou 'schoolId' (fallback)

            if (type === 'subscription') {
                const schoolId = parts[1];
                const plan = parts[2];
                // const duration = parts[3]; 

                // Mettre à jour l'abonnement de l'école
                if (schoolId && plan) {
                    await adminDb.collection('ecoles').doc(schoolId).update({
                        'subscription.status': 'active',
                        'subscription.plan': plan,
                        'subscription.startDate': new Date().toISOString(),
                        // 'subscription.endDate': ... calcul basée sur la durée
                        'updatedAt': new Date().toISOString()
                    });
                    console.log(`[Genius Webhook] Abonnement mis à jour pour l'école ${schoolId}`);
                }
            } else if (type === 'tuition') {
                // Logique pour les frais de scolarité
                // const schoolId = parts[1];
                // const studentId = parts[2];
                // await adminDb...
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[Genius Webhook] Erreur de traitement:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
