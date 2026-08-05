'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Enregistre le service worker qui met la coque de l'application en cache (voir
 * `public/sw.js`). Sans lui, l'application ne peut pas démarrer sans réseau, même si
 * toutes les données sont présentes dans le cache Firestore.
 *
 * L'enregistrement est différé après le chargement pour ne pas concurrencer les requêtes
 * du premier rendu.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Sur mobile, les fichiers sont déjà embarqués dans l'application par Capacitor :
    // le service worker n'apporte rien et viendrait s'interposer devant eux. Le test
    // sur NODE_ENV ne suffit pas, un build Capacitor étant lui aussi un build de production.
    if (Capacitor.isNativePlatform()) return;

    // En développement, le rechargement à chaud et le cache du service worker se
    // gênent mutuellement.
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(error => console.error('[ServiceWorker] Enregistrement échoué :', error));
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
