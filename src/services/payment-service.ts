
import type { User } from 'firebase/auth';

interface PaymentProviderData {
    type: 'subscription' | 'tuition';
    price: string;
    description: string;
    user: any; // Simplified for client usage
    schoolId: string;
    plan?: string;
    duration?: number;
    studentId?: string;
    phoneNumber?: string;
}

type PaymentProvider = 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya' | 'genius';

/**
 * Creates a checkout link by calling the backend API.
 * This replaces the previous Server Action to support static export.
 */
export async function createCheckoutLink(provider: PaymentProvider, data: PaymentProviderData) {
    const API_URL = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;

    try {
        const response = await fetch(`${API_URL}/api/payments/create-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider,
                ...data,
                // We don't send the full user object to avoid serialization issues, 
                // just what's needed for the backend to verify/identify.
                userId: data.user?.uid,
                userEmail: data.user?.email,
                userDisplayName: data.user?.displayName,
            }),
        });

        const result = await response.json();

        if (response.ok && result.url) {
            return { url: result.url, error: null };
        } else {
            return { url: null, error: result.error || "Erreur lors de la création du lien de paiement." };
        }
    } catch (e: any) {
        console.error("[PaymentService] Fetch error:", e);
        return { url: null, error: "Impossible de contacter le service de paiement." };
    }
}
