/**
 * Service de campagnes de communication en masse super-admin -> écoles.
 *
 * Une campagne cible des écoles via un sélecteur (réutilise le format
 * `AnnouncementTarget`) et fan-out via une Cloud Function qui injecte
 * un document par destinataire dans la collection `mail` (Trigger Email).
 *
 * Workflow :
 *   draft -> scheduled (publishAt) -> sending -> sent / failed
 */
import {
    Firestore,
    addDoc,
    collection,
    doc,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import type { AnnouncementTarget } from './announcement-service';

export type CampaignChannel = 'email' | 'whatsapp';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface Campaign {
    id?: string;
    name: string;
    channel: CampaignChannel;
    subject?: string; // email uniquement
    body: string;    // texte brut avec placeholders {{schoolName}}, {{directorName}}, {{plan}}, {{daysLeft}}
    target: AnnouncementTarget;
    status: CampaignStatus;
    scheduledAt?: string; // ISO ; si vide => envoi immédiat
    createdBy: string;
    createdByName?: string;
    createdAt?: any;
    stats?: {
        targetCount: number;
        queued: number;
        failed: number;
        startedAt?: any;
        completedAt?: any;
    };
}

export async function createCampaign(
    firestore: Firestore,
    data: Omit<Campaign, 'id' | 'createdAt' | 'stats' | 'status'> & { status?: CampaignStatus },
): Promise<string> {
    const ref = await addDoc(collection(firestore, 'campaigns'), {
        ...data,
        status: data.status ?? (data.scheduledAt ? 'scheduled' : 'draft'),
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

/**
 * Marque la campagne pour traitement immédiat. La Cloud Function
 * `processCampaign` (déclenchée par la transition vers `sending`)
 * prendra le relais pour fan-out vers `mail`/WhatsApp.
 */
export async function dispatchCampaign(firestore: Firestore, campaignId: string): Promise<void> {
    await updateDoc(doc(firestore, 'campaigns', campaignId), {
        status: 'sending',
    });
}

/**
 * Substitue les placeholders {{key}} dans `template` par `vars[key]`.
 * Les clés absentes sont laissées telles quelles pour faciliter le debug.
 */
export function renderTemplate(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => {
        const value = vars[key];
        return value === undefined || value === null ? m : String(value);
    });
}

export const AVAILABLE_PLACEHOLDERS = [
    'schoolName',
    'directorName',
    'plan',
    'daysLeft',
    'endDate',
] as const;
