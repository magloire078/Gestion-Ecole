
// Fichier de configuration pour l'intégration Orange SMS API (developer.orange.com)

const ORANGE_SMS_AUTH_HEADER = process.env.ORANGE_SMS_AUTH_HEADER || process.env.ORANGE_MONEY_AUTH_HEADER;
const ORANGE_SMS_SENDER_ADDRESS = process.env.ORANGE_SMS_SENDER_ADDRESS; // ex: +2250000
const ORANGE_SMS_SENDER_NAME = process.env.ORANGE_SMS_SENDER_NAME; // ex: GereEcole (alphanumérique, max 11 caractères)
const ORANGE_API_BASE_URL = "https://api.orange.com";

/**
 * Indique si la passerelle Orange SMS est configurée (credentials + numéro émetteur).
 */
export function isOrangeSmsConfigured(): boolean {
    return Boolean(ORANGE_SMS_AUTH_HEADER && ORANGE_SMS_SENDER_ADDRESS);
}

/**
 * Normalise un numéro ivoirien au format international tel:+225XXXXXXXXXX.
 * Accepte "0747286934", "+225 07 47 28 69 34", "2250747286934", etc.
 * Retourne null si le numéro est inexploitable.
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountryCode = '225'): string | null {
    if (!rawPhone) return null;
    const digits = rawPhone.replace(/[^\d+]/g, '');
    if (!digits) return null;

    if (digits.startsWith('+')) {
        const rest = digits.slice(1);
        return /^\d{8,15}$/.test(rest) ? `+${rest}` : null;
    }
    if (digits.startsWith(defaultCountryCode) && digits.length > 10) {
        return `+${digits}`;
    }
    // Numéro local (ex: 0747286934) → préfixe pays
    if (/^\d{8,10}$/.test(digits)) {
        return `+${defaultCountryCode}${digits}`;
    }
    return null;
}

/**
 * Obtient un token d'accès auprès de l'API Orange.
 */
async function getAccessToken(): Promise<string | null> {
    if (!ORANGE_SMS_AUTH_HEADER) {
        console.error("[Orange SMS] Auth Header non configuré (ORANGE_SMS_AUTH_HEADER).");
        return null;
    }

    try {
        const response = await fetch(`${ORANGE_API_BASE_URL}/oauth/v3/token`, {
            method: 'POST',
            headers: {
                'Authorization': ORANGE_SMS_AUTH_HEADER,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error("[Orange SMS] Erreur d'authentification:", errorBody);
            return null;
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("[Orange SMS] Erreur lors de l'obtention du token:", error);
        return null;
    }
}

/**
 * Envoie un SMS via l'API Orange SMS.
 * @param to Numéro du destinataire (format local ou international).
 * @param message Contenu du SMS.
 * @returns true si l'envoi a été accepté par l'API, false sinon.
 */
export async function sendSms(to: string, message: string): Promise<boolean> {
    if (!ORANGE_SMS_SENDER_ADDRESS) {
        console.error("[Orange SMS] Numéro émetteur non configuré (ORANGE_SMS_SENDER_ADDRESS).");
        return false;
    }

    const recipient = normalizePhoneNumber(to);
    if (!recipient) {
        console.error(`[Orange SMS] Numéro destinataire invalide: ${to}`);
        return false;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
        return false;
    }

    const senderAddress = `tel:${ORANGE_SMS_SENDER_ADDRESS}`;

    try {
        const response = await fetch(
            `${ORANGE_API_BASE_URL}/smsmessaging/v1/outbound/${encodeURIComponent(senderAddress)}/requests`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    outboundSMSMessageRequest: {
                        address: `tel:${recipient}`,
                        senderAddress,
                        ...(ORANGE_SMS_SENDER_NAME ? { senderName: ORANGE_SMS_SENDER_NAME } : {}),
                        outboundSMSTextMessage: { message },
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error(`[Orange SMS] Erreur d'envoi vers ${recipient}:`, JSON.stringify(errorBody));
            return false;
        }

        console.log(`[Orange SMS] SMS envoyé avec succès à ${recipient}.`);
        return true;
    } catch (error) {
        console.error(`[Orange SMS] Erreur lors de l'envoi vers ${recipient}:`, error);
        return false;
    }
}
