
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY is not set. Stripe functionality will not work.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
    apiVersion: '2024-06-20',
});

// XOF is not supported by Stripe Checkout; convert to EUR using the official fixed peg.
export const XOF_TO_EUR_RATE = 655.957;

export type StripePaymentType = 'subscription' | 'tuition';

interface CheckoutSessionData {
    type: StripePaymentType;
    amountXOF: number;
    planName: string;
    description: string;
    clientReferenceId: string;
    customerEmail?: string;
    schoolId: string;
    studentId?: string;
    durationMonths?: number;
}

export async function createStripeCheckoutSession(data: CheckoutSessionData) {
    const BASE_APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

    const amountInEUR = data.amountXOF / XOF_TO_EUR_RATE;
    const priceInCents = Math.max(50, Math.round(amountInEUR * 100)); // Stripe minimum is ~€0.50

    const metadata: Record<string, string> = {
        type: data.type,
        schoolId: data.schoolId,
        amountXOF: String(data.amountXOF),
    };
    if (data.studentId) metadata.studentId = data.studentId;
    if (data.durationMonths) metadata.durationMonths = String(data.durationMonths);
    if (data.planName) metadata.planName = data.planName;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: data.type === 'subscription' ? `Abonnement ${data.planName}` : data.planName,
                            description: data.description,
                        },
                        unit_amount: priceInCents,
                    },
                    quantity: 1,
                },
            ],
            customer_email: data.customerEmail,
            client_reference_id: data.clientReferenceId,
            metadata,
            payment_intent_data: { metadata },
            success_url: `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=canceled`,
        });
        return { url: session.url };
    } catch (error) {
        console.error("Erreur lors de la création de la session Stripe:", error);
        return { error: "Impossible de créer la session de paiement." };
    }
}

export { stripe };
