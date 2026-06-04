import { NextRequest, NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import { parsePaymentReference } from '@/lib/payment-reference';
import { verifyTimestampedHmac } from '@/lib/webhook-verify';
import { claimWebhookEvent } from '@/lib/webhook-idempotence';

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-webhook-signature');
        const timestamp = req.headers.get('x-webhook-timestamp');
        const event = req.headers.get('x-webhook-event');

        const sig = verifyTimestampedHmac(
            rawBody,
            signature,
            timestamp,
            process.env.GENIUS_WEBHOOK_SECRET,
        );
        if (!sig.valid) {
            console.error(`[Genius Webhook] Signature invalide: ${sig.reason}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const { id: eventId, transaction_id, order_id, status } = body;
        console.log(`[Genius Webhook] event=${event} id=${eventId} txn=${transaction_id} order=${order_id} status=${status}`);

        const isNew = await claimWebhookEvent('genius', String(eventId ?? transaction_id ?? ''));
        if (!isNew) {
            return NextResponse.json({ received: true, duplicate: true });
        }

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
