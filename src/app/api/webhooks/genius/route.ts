import { NextRequest, NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { transaction_id, order_id, status } = body;

        console.log(`[Genius Webhook] Notification reçue pour Transaction: ${transaction_id}, Order: ${order_id}, Status: ${status}`);

        if (status === 'SUCCESS' || status === 'COMPLETED') {
            // format: type__schoolId__studentIdOrDuration__amount
            const parts = order_id.split('__');
            const type = parts[0];

            if (type === 'subscription') {
                const schoolId = parts[1];
                const duration = parseInt(parts[2], 10) || 1;
                const amount = parts[3];

                await processSubscriptionPayment(schoolId, 'Abonnement', duration, 'Genius Pay');
                console.log(`[Genius Webhook] Abonnement traité pour l'école ${schoolId}`);

            } else if (type === 'tuition') {
                const schoolId = parts[1];
                const studentId = parts[2];
                const amount = parseFloat(parts[3]);

                await processTuitionPayment(schoolId, studentId, amount, 'Genius Pay');
                console.log(`[Genius Webhook] Scolarité traitée pour l'élève ${studentId}`);
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[Genius Webhook] Erreur de traitement:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
