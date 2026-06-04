import { NextRequest, NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import { parsePaymentReference } from '@/lib/payment-reference';
import { verifyTimestampedHmac } from '@/lib/webhook-verify';
import { claimWebhookEvent } from '@/lib/webhook-idempotence';

const SUCCESS_STATUSES = new Set(['success', 'completed', 'paid']);
const FAILURE_STATUSES = new Set(['failed', 'cancelled', 'canceled', 'expired', 'declined']);
const REFUND_STATUSES = new Set(['refunded']);

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-webhook-signature');
        const timestamp = req.headers.get('x-webhook-timestamp');
        const event = req.headers.get('x-webhook-event') || 'unknown';

        const sig = verifyTimestampedHmac(
            rawBody,
            signature,
            timestamp,
            process.env.GENIUS_WEBHOOK_SECRET,
        );
        if (!sig.valid) {
            console.error(`[Genius Webhook] Signature invalide: ${sig.reason}`);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const { id: eventId, transaction_id, reference, order_id, status, amount } = body;
        const normalizedStatus = String(status ?? '').toLowerCase();
        console.log(`[Genius Webhook] event=${event} id=${eventId} txn=${transaction_id} order=${order_id} status=${status}`);

        const idempotenceKey = String(eventId ?? transaction_id ?? reference ?? '').trim();
        if (!idempotenceKey) {
            console.error('[Genius Webhook] Payload sans identifiant exploitable — refusé.');
            return NextResponse.json({ error: 'Missing event identifier' }, { status: 400 });
        }
        const isNew = await claimWebhookEvent('genius', idempotenceKey);
        if (!isNew) {
            return NextResponse.json({ received: true, duplicate: true });
        }

        if (FAILURE_STATUSES.has(normalizedStatus)) {
            console.warn(`[Genius Webhook] Paiement échoué/annulé pour order=${order_id} status=${status}.`);
            return NextResponse.json({ received: true, ignored: true, reason: normalizedStatus });
        }

        if (REFUND_STATUSES.has(normalizedStatus)) {
            console.warn(`[Genius Webhook] Remboursement reçu pour order=${order_id} — non géré automatiquement.`);
            return NextResponse.json({ received: true, ignored: true, reason: 'refund_manual_review' });
        }

        if (!SUCCESS_STATUSES.has(normalizedStatus)) {
            // pending / processing — on accuse réception et on attend l'événement final.
            return NextResponse.json({ received: true, awaiting: normalizedStatus || 'unknown' });
        }

        const parsed = parsePaymentReference(order_id);
        if (!parsed) {
            console.warn(`[Genius Webhook] order_id invalide: ${order_id}`);
            return NextResponse.json({ error: 'Invalid order_id format' }, { status: 400 });
        }

        const paidAmount = typeof amount === 'number' ? amount : parsed.amount;

        if (parsed.type === 'subscription') {
            await processSubscriptionPayment(parsed.schoolId, parsed.planName, parsed.durationMonths, 'Genius Pay', paidAmount, 'XOF');
        } else {
            await processTuitionPayment(parsed.schoolId, parsed.studentId, paidAmount, 'Genius Pay');
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[Genius Webhook] Erreur de traitement:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
