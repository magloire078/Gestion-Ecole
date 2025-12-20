
'use server';

import { v4 as uuidv4 } from 'uuid';

const MTN_PRIMARY_KEY = process.env.MTN_PRIMARY_KEY;
const MTN_SECONDARY_KEY = process.env.MTN_SECONDARY_KEY;
const MTN_API_USER_ID = process.env.MTN_API_USER_ID;
const MTN_API_KEY = process.env.MTN_API_KEY;
const MTN_API_BASE_URL = "https://proxy.momoapi.mtn.com"; // Using proxy for sandbox, change for production
const MTN_TARGET_ENVIRONMENT = "mtn-ci"; 


interface MtnMomoPaymentData {
    amount: string;
    currency: 'XOF';
    externalId: string;
    payer: {
        partyIdType: 'MSISDN';
        partyId: string;
    };
    payerMessage: string;
    payeeNote: string;
}

/**
 * Creates an API user if one doesn't exist.
 * This is a one-time setup step for the MTN MoMo API.
 */
async function createApiUser(subscriptionKey: string) {
    const userId = uuidv4();
    const response = await fetch(`${MTN_API_BASE_URL}/v1_0/apiuser`, {
        method: 'POST',
        headers: {
            'X-Reference-Id': userId,
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerCallbackHost: 'https://example.com' }), // Callback host is mandatory
    });

    if (response.status === 201) {
        console.log('MTN API User created successfully with ID:', userId);
        return userId;
    } else if (response.status === 409) {
        console.log('MTN API User already exists.');
        return userId; // Or retrieve existing user ID
    } else {
        const errorBody = await response.text();
        console.error('Failed to create MTN API User:', response.status, errorBody);
        return null;
    }
}

/**
 * Creates an API key for the API user.
 * This is a one-time setup step for the MTN MoMo API.
 */
async function createApiKey(apiUserId: string, subscriptionKey: string) {
    const response = await fetch(`${MTN_API_BASE_URL}/v1_0/apiuser/${apiUserId}/apikey`, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
    });

    if (response.ok) {
        const data = await response.json();
        console.log('MTN API Key created successfully:', data.apiKey);
        return data.apiKey;
    } else {
        const errorBody = await response.text();
        console.error('Failed to create MTN API Key:', response.status, errorBody);
        return null;
    }
}


/**
 * Gets an access token from the MTN MoMo API.
 */
async function getAccessToken(): Promise<string | null> {
    if (!MTN_PRIMARY_KEY || !MTN_API_USER_ID || !MTN_API_KEY) {
        console.error("MTN MoMo API credentials are not configured.");
        return null;
    }

    const authString = Buffer.from(`${MTN_API_USER_ID}:${MTN_API_KEY}`).toString('base64');

    try {
        const response = await fetch("https://proxy.momoapi.mtn.com/collection/token/", {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
            },
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Erreur d'authentification MTN MoMo:", response.status, errorBody);
            return null;
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Erreur lors de l'obtention du token MTN MoMo:", error);
        return null;
    }
}

/**
 * Initiates a payment request with MTN MoMo.
 */
export async function requestMtnMomoPayment(data: MtnMomoPaymentData): Promise<{ transactionId: string; success: boolean, message: string }> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        return { success: false, message: "Impossible d'obtenir le token d'accès.", transactionId: '' };
    }
    
    const transactionId = uuidv4();

    try {
        const response = await fetch("https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Reference-Id': transactionId,
                'X-Target-Environment': MTN_TARGET_ENVIRONMENT,
                'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (response.status === 202) { // 202 Accepted means request is being processed
            return { success: true, message: "La demande de paiement a été envoyée.", transactionId };
        } else {
            const errorBody = await response.json();
            console.error("Erreur API de paiement MTN MoMo:", errorBody);
            return { success: false, message: `Erreur MTN MoMo: ${errorBody.message || 'Erreur inconnue'}`, transactionId };
        }
    } catch (error) {
        console.error("Erreur lors de la demande de paiement MTN MoMo:", error);
        return { success: false, message: "Erreur système lors de la communication avec MTN.", transactionId };
    }
}

// You might need a function to check the transaction status as well
export async function getMtnMomoTransactionStatus(transactionId: string) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        return null;
    }

    try {
        const response = await fetch(`https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Target-Environment': MTN_TARGET_ENVIRONMENT,
                'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
            },
        });
        
        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching MTN MoMo transaction status:", error);
        return null;
    }
}

