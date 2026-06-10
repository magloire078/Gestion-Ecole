import { NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import { parsePaymentReference } from '@/lib/payment-reference';
import { verifySharedSecret } from '@/lib/webhook-verify';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("[PayDunya Webhook] IPN reçu:", JSON.stringify(body, null, 2));

        if (!verifySharedSecret(body?.data?.hash || body?.hash, process.env.PAYDUNYA_MASTER_KEY)) {
            console.error("[PayDunya Webhook] Master key invalide.");
            return NextResponse.json({ error: "Invalid master key" }, { status: 401 });
        }

        const { data } = body;

        if (data?.status !== 'completed') {
            console.log(`[PayDunya Webhook] Statut ${data?.status}. Ignoré.`);
            return new Response(null, { status: 200 });
        }

        const reference = data?.custom_data?.reference;
        const parsed = parsePaymentReference(reference);
        if (!parsed) {
            console.warn(`[PayDunya Webhook] custom_data.reference invalide: ${reference}`);
            return new Response('Invalid reference format', { status: 400 });
        }

        const amountPaid = parseFloat(data?.invoice?.total_amount);

        if (parsed.type === 'tuition') {
            await processTuitionPayment(parsed.schoolId, parsed.studentId, amountPaid, 'PayDunya');
        } else {
            await processSubscriptionPayment(parsed.schoolId, parsed.planName, parsed.durationMonths, 'PayDunya', amountPaid, 'XOF');
        }

        return new Response(null, { status: 200 });
    } catch (error: any) {
        console.error("[PayDunya Webhook] Erreur:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
