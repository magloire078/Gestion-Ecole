import { NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import { parsePaymentReference } from '@/lib/payment-reference';
import { verifyHmacSignature } from '@/lib/webhook-verify';

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const sig = verifyHmacSignature(
            rawBody,
            request.headers.get('x-callback-signature'),
            process.env.MTN_WEBHOOK_SECRET,
            { algorithm: 'sha256', encoding: 'hex' }
        );
        if (!sig.valid) {
            console.error(`[MTN MoMo Webhook] Signature invalide: ${sig.reason}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
        const body = JSON.parse(rawBody);
        console.log("[MTN MoMo Webhook] IPN reçu:", JSON.stringify(body, null, 2));

        const { status, externalId, amount } = body;
        if (!status || !externalId) {
            console.error("[MTN MoMo Webhook] Champs requis manquants (status, externalId).");
            return new Response('Missing required fields', { status: 400 });
        }

        if (status !== 'SUCCESSFUL') {
            console.log(`[MTN MoMo Webhook] Statut ${status}. Ignoré.`);
            return new Response(null, { status: 200 });
        }

        const parsed = parsePaymentReference(externalId);
        if (!parsed) {
            console.warn(`[MTN MoMo Webhook] externalId invalide: ${externalId}`);
            return new Response('Invalid externalId format', { status: 400 });
        }

        const amountPaid = typeof amount === 'number' ? amount : parseFloat(amount);

        if (parsed.type === 'tuition') {
            await processTuitionPayment(parsed.schoolId, parsed.studentId, amountPaid, 'MTN MoMo');
        } else {
            await processSubscriptionPayment(parsed.schoolId, parsed.planName, parsed.durationMonths, 'MTN MoMo', amountPaid, 'XOF');
        }

        return new Response(null, { status: 200 });
    } catch (error: any) {
        console.error("[MTN MoMo Webhook] Erreur:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
