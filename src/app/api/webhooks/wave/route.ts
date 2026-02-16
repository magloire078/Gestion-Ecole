
import { NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("[Wave Webhook] Notification reçue:", body);

        const { type, data } = body;

        // Wave status check
        if (type !== 'checkout.session.completed' || data?.status !== 'complete') {
            return NextResponse.json({ message: "Événement ignoré" }, { status: 200 });
        }

        const clientReference = data?.client_reference;
        if (!clientReference) {
            console.error("[Wave Webhook] client_reference manquant.");
            return NextResponse.json({ error: "Missing client_reference" }, { status: 400 });
        }

        // Parse reference format: type__schoolId__studentIdOrDuration__amount
        const parts = clientReference.split('__');
        if (parts.length < 3) {
            // Fallback for old format if any (single underscore)
            const oldParts = clientReference.split('_');
            if (oldParts.length >= 3) {
                parts.splice(0, parts.length, ...oldParts);
            } else {
                console.warn(`[Wave Webhook] Format de référence invalide: ${clientReference}`);
                return NextResponse.json({ error: "Invalid reference format" }, { status: 400 });
            }
        }

        const paymentType = parts[0];
        const schoolId = parts[1];
        const amountPaid = parseFloat(data.amount) || (parseInt(data.amount_with_surplus_in_cents, 10) / 100);

        if (paymentType === 'tuition') {
            const studentId = parts[2];
            await processTuitionPayment(schoolId, studentId, amountPaid, 'Wave');
            console.log(`[Wave Webhook] Scolarité traitée pour l'élève ${studentId}`);
        } else if (paymentType === 'subscription') {
            const durationParts = parts[2].match(/\d+/);
            const durationMonths = durationParts ? parseInt(durationParts[0], 10) : 1;
            await processSubscriptionPayment(schoolId, 'Abonnement', durationMonths, 'Wave');
            console.log(`[Wave Webhook] Abonnement traité pour l'école ${schoolId}`);
        }

        return NextResponse.json({ message: "Succès" }, { status: 200 });

    } catch (error: any) {
        console.error("[Wave Webhook] Erreur:", error);
        return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
    }
}
