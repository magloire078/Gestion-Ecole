import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const MAX_RAW_BODY_BYTES = 50_000;

interface ClaimMetadata {
    rawBody?: string;
    status?: string;
    eventType?: string;
}

/**
 * Marque un événement webhook comme traité de manière atomique.
 * Retourne `true` si l'événement est nouveau (et a été enregistré),
 * `false` si l'événement a déjà été traité (à ignorer).
 *
 * Utilise une création conditionnelle sur `webhook_events/{provider}_{eventId}`
 * — la 2e tentative échoue avec un code ALREADY_EXISTS que l'on convertit
 * en `false`.
 *
 * Si `metadata.rawBody` est fourni, on le stocke (tronqué à 50 ko) pour
 * faciliter le debug a posteriori. Les bodies plus volumineux sont
 * tronqués et marqués `rawBodyTruncated: true`.
 */
export async function claimWebhookEvent(
    provider: string,
    eventId: string,
    metadata: ClaimMetadata = {},
): Promise<boolean> {
    if (!eventId) {
        console.warn(`[Idempotence] eventId manquant pour ${provider} — traitement par défaut.`);
        return true;
    }
    const docRef = getAdminDb().collection('webhook_events').doc(`${provider}_${eventId}`);

    const payload: Record<string, unknown> = {
        provider,
        eventId,
        processedAt: FieldValue.serverTimestamp(),
    };
    if (metadata.status) payload.status = metadata.status;
    if (metadata.eventType) payload.eventType = metadata.eventType;
    if (metadata.rawBody) {
        const truncated = metadata.rawBody.length > MAX_RAW_BODY_BYTES;
        payload.rawBody = truncated
            ? metadata.rawBody.slice(0, MAX_RAW_BODY_BYTES)
            : metadata.rawBody;
        if (truncated) payload.rawBodyTruncated = true;
    }

    try {
        await docRef.create(payload);
        return true;
    } catch (err: any) {
        if (err?.code === 6 || /already exists/i.test(err?.message ?? '')) {
            console.log(`[Idempotence] Événement ${provider}_${eventId} déjà traité — ignoré.`);
            return false;
        }
        throw err;
    }
}
