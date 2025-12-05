'use server';

// Fichier de configuration pour l'intégration CinetPay

// IMPORTANT: Ces informations doivent être stockées dans des variables d'environnement sécurisées en production.
// Ne jamais les exposer côté client.
const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY || "YOUR_CINETPAY_API_KEY";
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID || "YOUR_CINETPAY_SITE_ID";
const CINETPAY_API_URL = "https://api-checkout.cinetpay.com/v2/payment";

interface PaymentData {
    amount: number;
    currency: string;
    transaction_id: string;
    description: string;
    customer_name: string;
    customer_surname: string;
    customer_email: string;
}

/**
 * Génère une URL de paiement CinetPay.
 * Dans une application réelle, cette fonction serait appelée côté serveur pour des raisons de sécurité.
 * @param data Les données de la transaction.
 * @returns Le lien de paiement ou null en cas d'erreur.
 */
export async function getCinetPayPaymentLink(data: PaymentData) {

    // L'URL de base de votre application, à récupérer depuis les variables d'environnement
    const BASE_APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    
    const paymentPayload = {
        ...data,
        apikey: CINETPAY_API_KEY,
        site_id: CINETPAY_SITE_ID,
        notify_url: `${BASE_APP_URL}/api/webhooks/cinetpay`, // URL où CinetPay enverra les notifications de statut (backend)
        return_url: `${BASE_APP_URL}/dashboard/settings/subscription`, // URL où l'utilisateur est redirigé après le paiement
        metadata: JSON.stringify({ schoolId: data.transaction_id.split('_')[0] }) // Exemple de métadonnées
    };

    try {
        const response = await fetch(CINETPAY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentPayload),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Erreur API CinetPay:", errorBody);
            throw new Error(`Erreur CinetPay: ${errorBody.message || 'Erreur inconnue'}`);
        }

        const result = await response.json();

        if (result.code === '201') {
            return result.data.payment_url;
        } else {
            console.error("Réponse inattendue de CinetPay:", result);
            throw new Error(result.message || "Impossible de générer le lien de paiement.");
        }

    } catch (error) {
        console.error("Erreur lors de la génération du lien CinetPay:", error);
        return null;
    }
}
