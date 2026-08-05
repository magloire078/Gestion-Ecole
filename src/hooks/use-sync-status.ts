'use client';

import { useEffect, useState } from 'react';
import { waitForPendingWrites } from 'firebase/firestore';
import { firebaseFirestore as db } from '@/firebase/config';
import { onSyncError, type SyncErrorInfo } from '@/lib/offline-writes';

export interface SyncStatus {
  /** Le navigateur se déclare connecté. */
  isOnline: boolean;
  /** Des écritures locales attendent d'être confirmées par le serveur. */
  isSyncing: boolean;
  /** Dernier échec de synchronisation différée, le cas échéant. */
  lastError: SyncErrorInfo | null;
  /** Efface l'erreur affichée. */
  clearError: () => void;
}

/**
 * État de synchronisation de l'application.
 *
 * Hors ligne, les écritures sont conservées dans la file d'attente du SDK Firestore et
 * rejouées automatiquement à la reconnexion. Sans retour visuel, l'utilisateur n'a aucun
 * moyen de savoir si sa saisie est confirmée ou simplement en attente — d'où cet état,
 * destiné à être affiché en permanence.
 */
export function useSyncStatus(): SyncStatus {
  // On part du principe que la connexion est présente : le rendu serveur n'a pas accès à
  // `navigator`, et supposer l'inverse ferait clignoter une alerte « hors ligne » à
  // chaque chargement.
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<SyncErrorInfo | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    setIsOnline(navigator.onLine);

    // `waitForPendingWrites` se résout lorsque toutes les écritures locales ont été
    // acquittées par le serveur : c'est la mesure exacte de « synchronisation terminée ».
    const trackPendingWrites = () => {
      if (!db) return;
      setIsSyncing(true);
      waitForPendingWrites(db)
        .catch(() => {
          // Une nouvelle coupure pendant l'attente : l'indicateur repassera à
          // « synchronisation » au prochain retour du réseau.
        })
        .finally(() => setIsSyncing(false));
    };

    const handleOnline = () => {
      setIsOnline(true);
      trackPendingWrites();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Au montage, l'application peut déjà porter des écritures en attente (rechargement
    // juste après une saisie hors ligne).
    if (navigator.onLine) trackPendingWrites();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => onSyncError(setLastError), []);

  return {
    isOnline,
    isSyncing,
    lastError,
    clearError: () => setLastError(null),
  };
}
