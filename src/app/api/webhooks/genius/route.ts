import { NextRequest, NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import { parsePaymentReference } from '@/lib/payment-reference';
import { verifyHmacSignature } from '@/lib/webhook-verify';

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const sig = verifyHmacSignature(
            rawBody,
            req.headers.get('x-genius-signature'),
            process.env.GENIUS_WEBHOOK_SECRET,
            { algorithm: 'sha256', encoding: 'hex' }
        );
        if (!sig.valid) {
            console.error(`[Genius Webhook] Signature invalide: ${sig.reason}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
        const body = JSON.parse(rawBody);
        const { transaction_id, order_id, status } = body;

        console.log(`[Genius Webhook] Transaction: ${transaction_id}, Order: ${order_id}, Status: ${status}`);

        if (status !== 'SUCCESS' && status !== 'COMPLETED') {
            return NextResponse.json({ received: true });
        }

        const parsed = parsePaymentReference(order_id);
        if (!parsed) {
            console.warn(`[Genius Webhook] order_id invalide: ${order_id}`);
            return NextResponse.json({ error: "Invalid order_id format" }, { status: 400 });
        }

        if (parsed.type === 'subscription') {
            await processSubscriptionPayment(parsed.schoolId, parsed.planName, parsed.durationMonths, 'Genius Pay', parsed.amount, 'XOF');
        } else {
            await processTuitionPayment(parsed.schoolId, parsed.studentId, parsed.amount, 'Genius Pay');
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[Genius Webhook] Erreur de traitement:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
