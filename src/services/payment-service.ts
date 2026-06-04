import type { User } from 'firebase/auth';

interface PaymentProviderData {
    type: 'subscription' | 'tuition';
    amount: string;
    description: string;
    user: any; // Simplified for client usage
    schoolId: string;
    planName?: string;
    duration?: number;
    studentId?: string;
    phoneNumber?: string;
}

type PaymentProvider = 'orangemoney' | 'stripe' | 'wave' | 'mtn' | 'paydunya' | 'genius';

function resolveApiEndpoint(path: string): string {
    if (typeof window === 'undefined') return path;
    const isNative = !!(window as any).Capacitor ||
        /^(capacitor|file|ionic):/i.test(window.location.protocol);
    if (isNative) {
        const base = process.env.NEXT_PUBLIC_BASE_URL;
        if (!base) {
            console.warn('[PaymentService] NEXT_PUBLIC_BASE_URL requis en contexte natif/Capacitor.');
            return path;
        }
        return `${base.replace(/\/$/, '')}${path}`;
    }
    return path;
}

/**
 * Creates a checkout link by calling the backend API.
 * Uses a relative URL on the web (works on any host) and falls back to
 * NEXT_PUBLIC_BASE_URL when running inside Capacitor.
 */
export async function createCheckoutLink(provider: PaymentProvider, data: PaymentProviderData) {
    const endpoint = resolveApiEndpoint('/api/payments/create-link');

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider,
                ...data,
                userId: data.user?.uid,
                userEmail: data.user?.email,
                userDisplayName: data.user?.displayName,
            }),
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok && result.url) {
            return { url: result.url, error: null };
        }
        return {
            url: null,
            error: result.error || `Erreur ${response.status} lors de la création du lien de paiement.`,
        };
    } catch (e: any) {
        console.error("[PaymentService] Fetch error:", e);
        return { url: null, error: "Impossible de contacter le service de paiement." };
    }
}
