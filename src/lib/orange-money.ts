
// Fichier de configuration pour l'intégration Orange Money Côte d'Ivoire

const ORANGE_AUTH_HEADER = process.env.ORANGE_MONEY_AUTH_HEADER;
const ORANGE_API_BASE_URL = "https://api.orange.com";

interface OrangeMoneyPaymentData {
    merchant_key: string;
    currency: 'XOF';
    order_id: string;
    amount: number;
    return_url: string;
    cancel_url: string;
    notif_url: string;
    lang: 'fr';
    reference: string;
}

/**
 * Obtient un token d'accès auprès de l'API Orange Money.
 */
async function getAccessToken(): Promise<string | null> {
    if (!ORANGE_AUTH_HEADER) {
        console.error("Orange Money Auth Header is not configured.");
        return null;
    }

    try {
        const response = await fetch(`${ORANGE_API_BASE_URL}/oauth/v3/token`, {
            method: 'POST',
            headers: {
                'Authorization': ORANGE_AUTH_HEADER,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Erreur d'authentification Orange Money:", errorBody);
            return null;
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Erreur lors de l'obtention du token Orange Money:", error);
        return null;
    }
}

/**
 * Initialise une transaction de paiement web avec Orange Money.
 */
export async function getOrangeMoneyPaymentLink(data: OrangeMoneyPaymentData): Promise<string | null> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        return null;
    }

    try {
        const response = await fetch(`${ORANGE_API_BASE_URL}/orange-money-webpay/ci/v1/webpayment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Erreur API de paiement Orange Money:", errorBody);
            throw new Error(`Erreur Orange Money: ${errorBody.message || 'Erreur inconnue'}`);
        }

        const result = await response.json();

        if (result.status === 201 && result.data.payment_url) {
            return result.data.payment_url;
        } else {
            console.error("Réponse inattendue de l'API de paiement Orange Money:", result);
            throw new Error(result.message || "Impossible de générer le lien de paiement.");
        }
    } catch (error) {
        console.error("Erreur lors de la génération du lien de paiement Orange Money:", error);
        return null;
    }
}
