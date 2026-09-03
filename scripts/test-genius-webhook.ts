/**
 * Test hors-ligne du webhook GeniusPay contre le payload OFFICIEL de la doc.
 * N'appelle PAS l'API distante : valide la signature + l'extraction des champs.
 *   npx tsx scripts/test-genius-webhook.ts
 */
import crypto from 'crypto';
import { verifyTimestampedHmac } from '../src/lib/webhook-verify';
import { buildPaymentReference, parsePaymentReference } from '../src/lib/payment-reference';

let passed = 0, failed = 0;
function check(label: string, cond: boolean, detail?: string) {
    if (cond) { console.log(`  ✓ ${label}`); passed++; }
    else { console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

const SECRET = 'whsec_sandbox_test_123';

// 1) Notre référence interne, telle qu'envoyée dans metadata.order_id à la création.
const orderRef = buildPaymentReference({
    type: 'subscription', schoolId: 'schoolAbc123456', planName: 'Pro' as any, durationMonths: 12, amount: 120000,
});

// Reproduit la logique d'extraction + décision de src/app/api/webhooks/genius/route.ts
const SUCCESS = new Set(['success', 'completed', 'paid']);
const FAILURE = new Set(['failed', 'cancelled', 'canceled', 'expired', 'declined']);
const REFUND = new Set(['refunded']);
function extract(body: any) {
    const eventType = String(body.event ?? '').toLowerCase();
    const txn = body.data || {};
    const eventId = body.id;
    const reference = txn.reference;
    const orderId = txn?.metadata?.order_id;
    const status = String(txn.status ?? '').toLowerCase();
    const amount = typeof txn.amount === 'number' ? txn.amount : Number(txn.amount);
    const isSuccess = eventType === 'payment.success' || SUCCESS.has(status);
    const isFailure = ['payment.failed', 'payment.cancelled', 'payment.expired'].includes(eventType) || FAILURE.has(status);
    const isRefund = eventType === 'payment.refunded' || REFUND.has(status);
    return { eventType, eventId, reference, orderId, status, amount, isSuccess, isFailure, isRefund };
}

function signedRequest(body: any, secret = SECRET, tsOffset = 0) {
    const rawBody = JSON.stringify(body);
    const timestamp = String(Math.floor(Date.now() / 1000) + tsOffset);
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
    return { rawBody, timestamp, signature };
}

// Payload conforme à la doc (transaction imbriquée sous `data`, order_id dans metadata).
const successBody = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    event: 'payment.success',
    timestamp: 1735587600,
    data: {
        object: 'transaction', id: 12345, reference: 'MTX-A1B2C3D4E5',
        amount: 120000, currency: 'XOF', fees: 250, net_amount: 119750,
        status: 'completed', payment_method: 'mobile_money', provider: 'wave',
        metadata: { order_id: orderRef },
    },
    environment: 'live',
};

console.log('\n=== 1. Signature HMAC (doc: HMAC-SHA256(timestamp + "." + corps)) ===');
{
    const { rawBody, timestamp, signature } = signedRequest(successBody);
    check('signature valide acceptée', verifyTimestampedHmac(rawBody, signature, timestamp, SECRET).valid);
    check('signature falsifiée rejetée', !verifyTimestampedHmac(rawBody, signature.replace(/.$/, '0'), timestamp, SECRET).valid);
    check('mauvais secret rejeté', !verifyTimestampedHmac(rawBody, signature, timestamp, 'whsec_wrong').valid);
    const old = signedRequest(successBody, SECRET, -600); // 10 min dans le passé
    check('timestamp trop ancien rejeté (anti-rejeu)', !verifyTimestampedHmac(old.rawBody, old.signature, old.timestamp, SECRET).valid);
}

console.log('\n=== 2. Extraction des champs (le bug corrigé) ===');
{
    const e = extract(successBody);
    check('order_id lu depuis data.metadata.order_id', e.orderId === orderRef, `lu='${e.orderId}'`);
    check('status lu depuis data.status', e.status === 'completed');
    check('amount lu depuis data.amount', e.amount === 120000);
    check('reference GeniusPay lue', e.reference === 'MTX-A1B2C3D4E5');
    check('événement = succès', e.isSuccess && !e.isFailure && !e.isRefund);

    // Démonstration de l'ANCIEN code (lecture à la racine) => cassé
    const oldOrderId = (successBody as any).order_id;
    const oldStatus = (successBody as any).status;
    check('AVANT correctif: body.order_id était undefined', oldOrderId === undefined);
    check('AVANT correctif: body.status était undefined (=> jamais crédité)', oldStatus === undefined);
}

console.log('\n=== 3. Round-trip de la référence ===');
{
    const e = extract(successBody);
    const parsed = parsePaymentReference(e.orderId);
    check('parsePaymentReference réussit', parsed !== null);
    check('type = subscription', parsed?.type === 'subscription');
    check('schoolId correct', parsed?.type === 'subscription' && parsed.schoolId === 'schoolAbc123456');
    check('durationMonths correct', parsed?.type === 'subscription' && parsed.durationMonths === 12);
    check('montant correct', (parsed as any)?.amount === 120000);
}

console.log('\n=== 4. Autres événements ===');
{
    const failBody = { ...successBody, event: 'payment.failed', data: { ...successBody.data, status: 'failed' } };
    const ef = extract(failBody);
    check('payment.failed => isFailure', ef.isFailure && !ef.isSuccess);

    const refundBody = { ...successBody, event: 'payment.refunded', data: { ...successBody.data, status: 'refunded' } };
    const er = extract(refundBody);
    check('payment.refunded => isRefund', er.isRefund && !er.isSuccess);

    const pendingBody = { ...successBody, event: 'payment.initiated', data: { ...successBody.data, status: 'pending' } };
    const ep = extract(pendingBody);
    check('payment.initiated/pending => ni succès ni échec (awaiting)', !ep.isSuccess && !ep.isFailure && !ep.isRefund);
}

console.log(`\n──────────\nRésultat : ${passed} OK, ${failed} KO\n`);
process.exit(failed ? 1 : 0);
