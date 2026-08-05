'use client';

import { Capacitor } from '@capacitor/core';

/**
 * Base des appels aux routes serveur.
 *
 * Sur le web, l'application et ses routes API partagent la même origine : un chemin
 * relatif suffit, et c'est aussi ce qui évite tout problème de CORS.
 *
 * Dans la WebView Capacitor en revanche, l'application est servie depuis une origine
 * locale (`capacitor://localhost` ou `https://localhost`). Un `fetch('/api/…')` viserait
 * donc le téléphone lui-même, où rien n'écoute. Il faut une URL absolue vers le serveur.
 *
 * `NEXT_PUBLIC_API_BASE_URL` permet de produire un build mobile de test pointant sur une
 * préproduction, sans toucher au code.
 */
const REMOTE_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://www.gerecole.com';

export function apiUrl(path: string): string {
  if (!Capacitor.isNativePlatform()) return path;
  return `${REMOTE_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
