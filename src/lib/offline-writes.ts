'use client';

/**
 * Outils d'écriture tolérants au mode hors ligne.
 *
 * Le problème qu'ils résolvent : hors ligne, Firestore applique une écriture au cache
 * local immédiatement (les écouteurs `onSnapshot` rafraîchissent donc l'écran tout de
 * suite), mais la promesse retournée par `setDoc` / `updateDoc` / `deleteDoc` ne se
 * résout qu'à l'accusé de réception **du serveur**. Un `await` sur cette promesse ne
 * rend donc jamais la main tant que le réseau est absent : le formulaire reste bloqué
 * sur son indicateur de chargement, sans message ni fermeture. L'utilisateur en conclut
 * à un échec et ressaisit — d'où des doublons à la reconnexion.
 */

export interface SyncErrorInfo {
  /** Description lisible de l'opération, pour les journaux et l'interface. */
  operation: string;
  /** Code Firestore lorsqu'il est disponible (`permission-denied`, `unavailable`…). */
  code?: string;
  error: unknown;
}

type SyncErrorListener = (info: SyncErrorInfo) => void;

const listeners = new Set<SyncErrorListener>();

/**
 * S'abonne aux échecs de synchronisation différée. Utile pour afficher un avertissement
 * global : une écriture acceptée localement peut être refusée par les règles de sécurité
 * au moment de la synchronisation (les règles ne sont pas évaluées hors ligne), auquel
 * cas la donnée disparaît de l'écran sans que l'utilisateur comprenne pourquoi.
 *
 * Renvoie la fonction de désabonnement.
 */
export function onSyncError(listener: SyncErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Construit un gestionnaire d'erreur à brancher sur une écriture non attendue.
 */
export function reportSyncError(operation: string) {
  return (error: unknown) => {
    const code = (error as { code?: string })?.code;
    console.error(`[Sync] Échec de synchronisation — ${operation} :`, code ?? error);
    listeners.forEach(listener => listener({ operation, code, error }));
  };
}

/** Résultat d'une écriture : confirmée par le serveur, ou mise en file d'attente locale. */
export type WriteOutcome = 'acknowledged' | 'queued';

/** Délai au-delà duquel on considère l'écriture comme différée plutôt que confirmée. */
const ACK_TIMEOUT_MS = 1500;

/**
 * Attend l'accusé de réception du serveur, mais au plus `timeoutMs`.
 *
 * - **En ligne** : le serveur répond en quelques dizaines de millisecondes. Les erreurs
 *   (permissions, validation) sont propagées à l'appelant exactement comme avec un
 *   `await` classique — le comportement existant est donc préservé.
 * - **Hors ligne** : la promesse ne se résoudrait jamais. Passé le délai, on rend la main
 *   à l'interface avec l'état `queued`. L'écriture reste dans la file d'attente du SDK,
 *   qui la rejouera automatiquement à la reconnexion.
 *
 * @throws l'erreur Firestore si le serveur rejette l'écriture avant expiration du délai.
 */
export async function commitWrite(
  write: Promise<unknown>,
  operation: string,
  timeoutMs: number = ACK_TIMEOUT_MS,
): Promise<WriteOutcome> {
  // Filet permanent : si l'écriture échoue après l'expiration du délai, l'erreur est
  // signalée au lieu de produire un rejet non géré.
  write.catch(reportSyncError(operation));

  // Quand le navigateur se sait hors ligne, inutile d'attendre le délai complet.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'queued';
  }

  return Promise.race([
    write.then(() => 'acknowledged' as const),
    new Promise<WriteOutcome>(resolve => setTimeout(() => resolve('queued'), timeoutMs)),
  ]);
}

/**
 * Message à afficher selon l'issue de l'écriture, pour que l'utilisateur sache si sa
 * saisie est confirmée ou en attente de synchronisation.
 */
export function writeOutcomeMessage(outcome: WriteOutcome, confirmed: string): string {
  return outcome === 'acknowledged'
    ? confirmed
    : 'Enregistré sur cet appareil. La synchronisation se fera automatiquement dès le retour du réseau.';
}
