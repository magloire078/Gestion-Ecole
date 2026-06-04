import { NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import { parsePaymentReference } from '@/lib/payment-reference';
import { verifyHmacSignature } from '@/lib/webhook-verify';

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const sig = verifyHmacSignature(
            rawBody,
            request.headers.get('x-orange-signature'),
            process.env.ORANGE_MONEY_WEBHOOK_SECRET,
            { algorithm: 'sha256', encoding: 'hex' }
        );
        if (!sig.valid) {
            console.error(`[Orange Money Webhook] Signature invalide: ${sig.reason}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
        const body = JSON.parse(rawBody);
        console.log("[Orange Money Webhook] IPN reçu:", JSON.stringify(body, null, 2));

        const { status, reference, amount } = body;
        if (!status || !reference) {
            console.error("[Orange Money Webhook] Champs requis manquants (status, reference).");
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        if (status !== 'SUCCESS') {
            console.log(`[Orange Money Webhook] Statut ${status}. Ignoré.`);
            return NextResponse.json({}, { status: 200 });
        }

        const parsed = parsePaymentReference(reference);
        if (!parsed) {
            console.warn(`[Orange Money Webhook] Référence invalide: ${reference}`);
            return NextResponse.json({ error: "Invalid reference format" }, { status: 400 });
        }

        const amountPaid = typeof amount === 'number' ? amount : parseFloat(amount);

        if (parsed.type === 'tuition') {
            await processTuitionPayment(parsed.schoolId, parsed.studentId, amountPaid, 'Orange Money');
        } else {
            await processSubscriptionPayment(parsed.schoolId, parsed.planName, parsed.durationMonths, 'Orange Money');
        }

        return NextResponse.json({}, { status: 200 });
    } catch (error: any) {
        console.error("[Orange Money Webhook] Erreur:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
