import axios from 'axios';

// Configuration basée sur la documentation officielle Genius Pay
const GENIUS_API_URL = process.env.NEXT_PUBLIC_GENIUS_PAY_API_URL || 'https://pay.genius.ci/api/v1/merchant';
const GENIUS_API_KEY = process.env.NEXT_PUBLIC_GENIUS_PAY_API_KEY; // pk_sandbox_xxx ou pk_live_xxx
const GENIUS_API_SECRET = process.env.GENIUS_PAY_API_SECRET; // sk_sandbox_xxx ou sk_live_xxx

interface GeniusPaymentInit {
    amount: number;
    currency?: string;
    orderId: string;
    description?: string;
    payerName?: string;
    payerEmail?: string;
    payerPhone?: string;
    successUrl?: string;
    errorUrl?: string;
    metadata?: Record<string, any>;
}

interface GeniusPaymentResponse {
    success: boolean;
    data: {
        id: number;
        reference: string;
        amount: number;
        currency: string;
        fees?: number;
        net_amount?: number;
        status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
        checkout_url: string; // URL vers la page de checkout GeniusPay
        payment_url: string; // Même que checkout_url
        environment: 'sandbox' | 'live';
        expires_at?: string;
        gateway?: string;
    };
}

interface GeniusPaymentDetails {
    success: boolean;
    data: {
        id: number;
        reference: string;
        amount: number;
        currency: string;
        fees: number;
        net_amount: number;
        status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'expired';
        payment_method?: string;
        provider?: string;
        customer_name?: string;
        customer_email?: string;
        customer_phone?: string;
        metadata?: Record<string, any>;
        created_at: string;
        updated_at: string;
    };
}

/**
 * Initialise un paiement avec Genius Pay.
 * Mode Checkout: Sans spécifier payment_method, le client choisit sur la page GeniusPay.
 * 
 * Documentation: https://pay.genius.ci/docs/api
 */
export async function createGeniusPayment(data: GeniusPaymentInit): Promise<GeniusPaymentResponse> {
    if (!GENIUS_API_KEY || !GENIUS_API_SECRET) {
        throw new Error("Les clés API Genius Pay ne sont pas configurées.");
    }

    try {
        const response = await axios.post<GeniusPaymentResponse>(
            `${GENIUS_API_URL}/payments`,
            {
                amount: data.amount,
                currency: data.currency || 'XOF',
                description: data.description,
                // PAS de payment_method = Mode Checkout (page GeniusPay)
                customer: {
                    name: data.payerName,
                    email: data.payerEmail,
                    phone: data.payerPhone
                },
                success_url: data.successUrl,
                error_url: data.errorUrl,
                metadata: {
                    ...data.metadata,
                    order_id: data.orderId,
                    source: 'gestion-ecole'
                }
            },
            {
                headers: {
                    'X-API-Key': GENIUS_API_KEY,
                    'X-API-Secret': GENIUS_API_SECRET,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error: any) {
        console.error("Erreur lors de l'initialisation du paiement Genius Pay:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Impossible de créer le paiement Genius Pay.");
    }
}

/**
 * Vérifie le statut d'une transaction par sa référence.
 * 
 * @param reference - Référence de la transaction (ex: MTX-A1B2C3D4E5)
 */
export async function verifyGeniusPayment(reference: string): Promise<GeniusPaymentDetails> {
    if (!GENIUS_API_KEY || !GENIUS_API_SECRET) {
        throw new Error("Les clés API Genius Pay ne sont pas configurées.");
    }

    try {
        const response = await axios.get<GeniusPaymentDetails>(
            `${GENIUS_API_URL}/payments/${reference}`,
            {
                headers: {
                    'X-API-Key': GENIUS_API_KEY,
                    'X-API-Secret': GENIUS_API_SECRET
                }
            }
        );
        return response.data;
    } catch (error: any) {
        console.error("Erreur lors de la vérification du paiement Genius Pay:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * Liste les paiements avec filtres optionnels.
 */
export async function listGeniusPayments(params?: {
    status?: 'pending' | 'completed' | 'failed';
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
    per_page?: number;
}): Promise<any> {
    if (!GENIUS_API_KEY || !GENIUS_API_SECRET) {
        throw new Error("Les clés API Genius Pay ne sont pas configurées.");
    }

    try {
        const response = await axios.get(
            `${GENIUS_API_URL}/payments`,
            {
                headers: {
                    'X-API-Key': GENIUS_API_KEY,
                    'X-API-Secret': GENIUS_API_SECRET
                },
                params
            }
        );
        return response.data;
    } catch (error: any) {
        console.error("Erreur lors de la récupération des paiements:", error.response?.data || error.message);
        throw error;
    }
}

/**
 * Récupère le solde du compte marchand.
 */
export async function getGeniusBalance(): Promise<any> {
    if (!GENIUS_API_KEY || !GENIUS_API_SECRET) {
        throw new Error("Les clés API Genius Pay ne sont pas configurées.");
    }

    try {
        const response = await axios.get(
            `${GENIUS_API_URL}/account/balance`,
            {
                headers: {
                    'X-API-Key': GENIUS_API_KEY,
                    'X-API-Secret': GENIUS_API_SECRET
                }
            }
        );
        return response.data;
    } catch (error: any) {
        console.error("Erreur lors de la récupération du solde:", error.response?.data || error.message);
        throw error;
    }
}

