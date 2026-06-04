import { NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import { parsePaymentReference } from '@/lib/payment-reference';
import { verifyHmacSignature } from '@/lib/webhook-verify';

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const sig = verifyHmacSignature(
            rawBody,
            request.headers.get('wave-signature'),
            process.env.WAVE_WEBHOOK_SECRET,
            { algorithm: 'sha256', encoding: 'hex' }
        );
        if (!sig.valid) {
            console.error(`[Wave Webhook] Signature invalide: ${sig.reason}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
        const body = JSON.parse(rawBody);
        console.log("[Wave Webhook] Notification reçue:", body);

        const { type, data } = body;

        if (type !== 'checkout.session.completed' || data?.status !== 'complete') {
            return NextResponse.json({ message: "Événement ignoré" }, { status: 200 });
        }

        const parsed = parsePaymentReference(data?.client_reference);
        if (!parsed) {
            console.error(`[Wave Webhook] client_reference invalide: ${data?.client_reference}`);
            return NextResponse.json({ error: "Invalid reference format" }, { status: 400 });
        }

        const amountPaid = parseFloat(data.amount) || (parseInt(data.amount_with_surplus_in_cents, 10) / 100);

        if (parsed.type === 'tuition') {
            await processTuitionPayment(parsed.schoolId, parsed.studentId, amountPaid, 'Wave');
        } else {
            await processSubscriptionPayment(parsed.schoolId, parsed.planName, parsed.durationMonths, 'Wave', amountPaid, 'XOF');
        }

        return NextResponse.json({ message: "Succès" }, { status: 200 });
    } catch (error: any) {
        console.error("[Wave Webhook] Erreur:", error);
        return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
    }
}
