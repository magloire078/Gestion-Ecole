import { NextRequest, NextResponse } from 'next/server';
import { processSubscriptionPayment, processTuitionPayment } from '@/lib/payment-processing';
import { getAdminDb } from '@/firebase/admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const signature = req.headers.get('x-webhook-signature');
        const timestamp = req.headers.get('x-webhook-timestamp');
        const eventType = req.headers.get('x-webhook-event');
        const rawBody = await req.text();
        const secret = process.env.GENIUS_PAY_API_SECRET || process.env.GENIUS_PAY_CLIENT_SECRET;

        // 1. Vérification de la signature
        if (signature && timestamp && secret) {
            const expected = crypto
                .createHmac('sha256', secret)
                .update(`${timestamp}.${rawBody}`)
                .digest('hex');
            
            // Timing-safe equal (to avoid timing attacks)
            if (expected !== signature) {
                console.error("[Genius Webhook] Signature invalide");
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        } else if (process.env.NODE_ENV === 'production') {
            console.warn("[Genius Webhook] Signature ou secret manquant en production");
            // return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 }); // Décommenter pour forcer
        }

        const body = JSON.parse(rawBody);
        const { transaction_id, order_id, status, id } = body;
        const eventId = id || transaction_id;

        console.log(`[Genius Webhook] Notification reçue - Event: ${eventType}, EventID: ${eventId}, Order: ${order_id}, Status: ${status}`);

        // 3. Gestion de l'idempotence
        if (eventId) {
            const db = getAdminDb();
            const webhookRef = db.collection('webhook_events').doc(`genius_${eventId}`);
            const webhookDoc = await webhookRef.get();

            if (webhookDoc.exists) {
                console.log(`[Genius Webhook] Événement ${eventId} déjà traité.`);
                return NextResponse.json({ received: true, message: 'Already processed' });
            }

            // Marquer comme en cours de traitement
            await webhookRef.set({
                eventId,
                provider: 'genius_pay',
                status,
                order_id,
                receivedAt: new Date().toISOString()
            });
        }

        if (status === 'SUCCESS' || status === 'COMPLETED') {
            // format: type__schoolId__studentIdOrDuration__amount
            const parts = order_id.split('__');
            const type = parts[0];

            // 2. Traitement en "arrière-plan" (Next.js serverless ne garantit pas la continuité si on n'await pas,
            // mais les fonctions Firebase Firestore sont généralement très rapides < 5s)
            const processPayment = async () => {
                if (type === 'subscription') {
                    const schoolId = parts[1];
                    const duration = parseInt(parts[2], 10) || 1;
                    
                    await processSubscriptionPayment(schoolId, 'Abonnement', duration, 'Genius Pay');
                    console.log(`[Genius Webhook] Abonnement traité pour l'école ${schoolId}`);

                } else if (type === 'tuition') {
                    const schoolId = parts[1];
                    const studentId = parts[2];
                    const amount = parseFloat(parts[3]);

                    await processTuitionPayment(schoolId, studentId, amount, 'Genius Pay');
                    console.log(`[Genius Webhook] Scolarité traitée pour l'élève ${studentId}`);
                }
            };

            await processPayment();
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[Genius Webhook] Erreur de traitement:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
