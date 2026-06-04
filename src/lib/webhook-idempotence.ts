import { getAdminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Marque un événement webhook comme traité de manière atomique.
 * Retourne `true` si l'événement est nouveau (et a été enregistré),
 * `false` si l'événement a déjà été traité (à ignorer).
 *
 * Utilise une création conditionnelle sur `webhook_events/{provider}_{eventId}`
 * — la 2e tentative échoue avec un code ALREADY_EXISTS que l'on convertit
 * en `false`.
 */
export async function claimWebhookEvent(provider: string, eventId: string): Promise<boolean> {
    if (!eventId) {
        console.warn(`[Idempotence] eventId manquant pour ${provider} — traitement par défaut.`);
        return true;
    }
    const docRef = getAdminDb().collection('webhook_events').doc(`${provider}_${eventId}`);
    try {
        await docRef.create({
            provider,
            eventId,
            processedAt: FieldValue.serverTimestamp(),
        });
        return true;
    } catch (err: any) {
        if (err?.code === 6 || /already exists/i.test(err?.message ?? '')) {
            console.log(`[Idempotence] Événement ${provider}_${eventId} déjà traité — ignoré.`);
            return false;
        }
        throw err;
    }
}
