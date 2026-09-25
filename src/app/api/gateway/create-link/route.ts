
import { NextResponse } from 'next/server';
import { createGeniusPayment } from '@/lib/genius-pay';
import { buildPaymentReference } from '@/lib/payment-reference';
import type { PlanName } from '@/lib/subscription-plans';

// GeniusPay est l'unique prestataire de paiement actif. Les autres
// (Stripe/Wave/MTN/PayDunya/Orange Money) ont été retirés du produit ;
// leur code et leurs webhooks ont été supprimés/neutralisés pour réduire
// la surface d'attaque. Voir aussi src/app/api/webhooks/*.
const ENABLED_PROVIDERS = new Set(['genius']);

function resolveBaseUrl(req: Request): string {
    const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    if (env) return env.replace(/\/$/, '');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const host = forwardedHost || req.headers.get('host');
    if (host) {
        const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
        return `${proto}://${host}`;
    }
    try {
        return new URL(req.url).origin;
    } catch {
        return 'http://localhost:3000';
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            provider,
            type,
            schoolId,
            studentId,
            amount: rawAmount,
            duration,
            planName,
            userEmail,
            userDisplayName,
            phone,
        } = body;

        console.log("[CreateLinkAPI] Received body:", { provider, type, schoolId, rawAmount, planName });

        const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : rawAmount;

        if (!provider || !type || !schoolId || !amount) {
            console.error("[CreateLinkAPI] Validation failed. Missing params:", {
                hasProvider: !!provider,
                hasType: !!type,
                hasSchoolId: !!schoolId,
                hasAmount: !!amount,
                amountValue: amount
            });
            return NextResponse.json({ error: "Paramètres manquants ou invalides (le montant doit être supérieur à 0)." }, { status: 400 });
        }

        if (!ENABLED_PROVIDERS.has(String(provider).toLowerCase())) {
            console.warn(`[CreateLinkAPI] Fournisseur non supporté demandé: ${provider}`);
            return NextResponse.json({ error: "Fournisseur de paiement non supporté." }, { status: 400 });
        }

        const BASE_URL = resolveBaseUrl(req);

        if (type === 'subscription' && !planName) {
            return NextResponse.json({ error: "Nom de plan requis pour un abonnement." }, { status: 400 });
        }
        if (type === 'tuition' && !studentId) {
            return NextResponse.json({ error: "studentId requis pour une scolarité." }, { status: 400 });
        }

        const referenceValue = type === 'tuition'
            ? buildPaymentReference({ type: 'tuition', schoolId, studentId, amount })
            : buildPaymentReference({
                type: 'subscription',
                schoolId,
                planName: planName as PlanName,
                durationMonths: parseInt(String(duration || '1').replace('m', ''), 10) || 1,
                amount,
            });

        const successUrl = `${BASE_URL}/payment/success?type=${type}`;
        const errorUrl = (psp: string) => `${BASE_URL}/payment/error?type=${type}&provider=${psp}${planName ? `&plan=${encodeURIComponent(planName)}` : ''}`;

        const geniusResult = await createGeniusPayment({
            amount: amount,
            currency: 'XOF',
            description: type === 'tuition' ? `Scolarité student_${studentId}` : `Abonnement school_${schoolId}`,
            orderId: referenceValue,
            payerName: userDisplayName || 'Client GèreEcole',
            payerEmail: userEmail,
            payerPhone: phone,
            successUrl,
            errorUrl: errorUrl('genius'),
            metadata: {
                type,
                schoolId,
                studentId: studentId || '',
                duration: duration || ''
            }
        });
        const finalGeniusUrl = geniusResult.data?.payment_url || geniusResult.data?.checkout_url;
        if (!finalGeniusUrl) return NextResponse.json({ error: "L'URL de paiement Genius n'a pas été générée par l'API." }, { status: 500 });
        return NextResponse.json({ url: finalGeniusUrl });
    } catch (error: any) {
        console.error("[CreateLinkAPI] Error:", error);
        // Remonte un message actionnable au client (ex. « clés API Genius Pay
        // non configurées ») plutôt qu'un 500 opaque. Les messages des
        // librairies de paiement décrivent la cause sans exposer de secret.
        const message = typeof error?.message === 'string' && error.message.trim()
            ? error.message
            : "Erreur interne du serveur.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
