/**
 * Service d'annonces plateforme (super-admin -> écoles).
 *
 * Une annonce est un message diffusé que les écoles voient sous forme
 * de bandeau dans leur dashboard, avec ciblage optionnel par plan, statut
 * d'abonnement, ou liste d'écoles spécifiques.
 */
import {
    Firestore,
    addDoc,
    collection,
    deleteDoc,
    doc,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';

export type AnnouncementSeverity = 'info' | 'warning' | 'critical';

export type AnnouncementTarget =
    | { type: 'all' }
    | { type: 'plan'; values: string[] }
    | { type: 'status'; values: ('active' | 'trialing' | 'past_due' | 'expired' | 'canceled')[] }
    | { type: 'school'; values: string[] };

export interface PlatformAnnouncement {
    id?: string;
    title: string;
    content: string; // texte brut + retours à la ligne
    severity: AnnouncementSeverity;
    target: AnnouncementTarget;
    publishAt: string; // ISO date
    expiresAt?: string; // ISO date
    createdBy: string;
    createdByName?: string;
    createdAt?: any;
    dismissedBy?: string[];
}

export async function createAnnouncement(
    firestore: Firestore,
    data: Omit<PlatformAnnouncement, 'id' | 'createdAt' | 'dismissedBy'>,
): Promise<string> {
    const ref = await addDoc(collection(firestore, 'platform_announcements'), {
        ...data,
        dismissedBy: [],
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function deleteAnnouncement(
    firestore: Firestore,
    announcementId: string,
): Promise<void> {
    await deleteDoc(doc(firestore, 'platform_announcements', announcementId));
}

export async function dismissAnnouncement(
    firestore: Firestore,
    announcementId: string,
    userId: string,
    currentDismissed: string[],
): Promise<void> {
    if (currentDismissed.includes(userId)) return;
    await updateDoc(doc(firestore, 'platform_announcements', announcementId), {
        dismissedBy: [...currentDismissed, userId],
    });
}

/**
 * Test si une école est ciblée par l'annonce (pure fonction).
 */
export function matchesTarget(
    target: AnnouncementTarget,
    school: { id: string; plan?: string; status?: string },
): boolean {
    switch (target.type) {
        case 'all':
            return true;
        case 'plan':
            return !!school.plan && target.values.includes(school.plan);
        case 'status':
            return !!school.status && (target.values as string[]).includes(school.status);
        case 'school':
            return target.values.includes(school.id);
        default:
            return false;
    }
}

export function isAnnouncementActive(
    a: PlatformAnnouncement,
    now: Date = new Date(),
): boolean {
    const publishOk = !a.publishAt || new Date(a.publishAt) <= now;
    const expireOk = !a.expiresAt || new Date(a.expiresAt) > now;
    return publishOk && expireOk;
}
