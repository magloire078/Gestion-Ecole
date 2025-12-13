'use server';

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in the environment variables.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

interface CheckoutSessionData {
    priceInCents: number;
    planName: string;
    description: string;
    clientReferenceId: string; // To link the session to your internal user/school ID
    customerEmail?: string;
}

export async function createStripeCheckoutSession(data: CheckoutSessionData) {
    const BASE_APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'eur', // Stripe for Côte d'Ivoire currently supports EUR, USD etc. but not XOF directly for Checkout
                        product_data: {
                            name: `Abonnement ${data.planName}`,
                            description: data.description,
                        },
                        unit_amount: data.priceInCents,
                    },
                    quantity: 1,
                },
            ],
            customer_email: data.customerEmail,
            client_reference_id: data.clientReferenceId,
            success_url: `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${BASE_APP_URL}/dashboard/parametres/abonnement?payment_status=canceled`,
        });
        return { url: session.url };
    } catch (error) {
        console.error("Erreur lors de la création de la session Stripe:", error);
        return { error: "Impossible de créer la session de paiement." };
    }
}
