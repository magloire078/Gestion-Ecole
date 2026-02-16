
// Fichier de configuration pour l'intégration Wave Business
const WAVE_API_KEY = process.env.WAVE_API_KEY;
const WAVE_API_BASE_URL = "https://api.wave.com";

interface WaveCheckoutData {
    amount: string;
    currency: 'XOF';
    error_url: string;
    success_url: string;
    client_reference?: string;
}

/**
 * Crée une session de paiement avec l'API Wave.
 * @param data - Les données nécessaires pour la session de paiement.
 * @returns L'URL de paiement Wave ou null en cas d'échec.
 */
export async function createWaveCheckoutSession(data: WaveCheckoutData): Promise<string | null> {
    if (!WAVE_API_KEY) {
        console.error("Wave API Key is not configured.");
        return null;
    }

    try {
        const response = await fetch(`${WAVE_API_BASE_URL}/v1/checkout/sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WAVE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("Erreur de l'API Wave:", responseData);
            throw new Error(responseData.message || "Une erreur est survenue avec l'API Wave.");
        }

        if (responseData.wave_launch_url) {
            return responseData.wave_launch_url;
        } else {
            console.error("Réponse inattendue de l'API Wave:", responseData);
            throw new Error("Impossible de récupérer l'URL de paiement Wave.");
        }
    } catch (error) {
        console.error("Erreur lors de la création de la session de paiement Wave:", error);
        return null;
    }
}
