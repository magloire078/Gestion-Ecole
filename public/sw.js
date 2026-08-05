/* eslint-disable no-restricted-globals */
/**
 * Service worker de GèreEcole.
 *
 * Rôle : rendre la *coque* de l'application disponible sans réseau. Sans lui, un
 * navigateur hors ligne ne peut même pas charger le JS et le CSS de l'application — le
 * cache Firestore aurait beau contenir toutes les données, l'écran resterait blanc.
 *
 * Ce qu'il ne fait délibérément pas : toucher aux données. Les requêtes vers Firestore
 * sont d'origine externe et ne sont jamais interceptées ; leur mode hors ligne est géré
 * par le cache persistant du SDK Firebase, qui sait rejouer les écritures en attente.
 * Mettre ces réponses en cache ici produirait des données périmées concurrentes.
 */

const VERSION = 'v1';
const STATIC_CACHE = `gerecole-static-${VERSION}`;
const PAGES_CACHE = `gerecole-pages-${VERSION}`;

/** Réponse de dernier recours quand aucune page n'est en cache. */
const FALLBACK_HTML = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hors ligne — GèreEcole</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;align-items:center;
       justify-content:center;min-height:100vh;margin:0;background:#f8faff;color:#0C365A;padding:1.5rem}
  main{max-width:26rem;text-align:center}
  h1{font-size:1.25rem;margin:0 0 .5rem}
  p{margin:0;line-height:1.5;color:#475569}
</style></head>
<body><main>
  <h1>Vous êtes hors ligne</h1>
  <p>Cette page n'a pas encore été consultée sur cet appareil, elle n'est donc pas
     disponible sans réseau. Les pages déjà ouvertes restent accessibles.</p>
</main></body></html>`;

self.addEventListener('install', event => {
  // La nouvelle version prend la main sans attendre la fermeture des onglets ouverts.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith('gerecole-') && key !== STATIC_CACHE && key !== PAGES_CACHE)
          .map(key => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Ressources versionnées par empreinte : leur contenu ne change jamais pour une même URL. */
function isImmutableAsset(url) {
  return url.pathname.startsWith('/_next/static/');
}

/** Ressources publiques utiles hors ligne mais susceptibles d'évoluer. */
function isPublicAsset(url) {
  return (
    url.pathname === '/manifest.json' ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.startsWith('/custom-assets/') ||
    url.pathname.startsWith('/sounds/')
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // Le cache répond immédiatement s'il a la ressource ; sinon on attend le réseau.
  return cached || (await network) || Response.error();
}

/**
 * Navigation : le réseau d'abord, pour ne jamais servir une page périmée quand la
 * connexion est disponible, avec repli sur la dernière version connue.
 */
async function networkFirstNavigation(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;

    // La page demandée n'a jamais été visitée : on tente n'importe quelle page déjà en
    // cache, ce qui permet au moins de démarrer l'application et de naviguer.
    const anyCached = (await cache.keys())[0];
    if (anyCached) {
      const fallback = await cache.match(anyCached);
      if (fallback) return fallback;
    }

    return new Response(FALLBACK_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;

  // Les écritures ne sont jamais interceptées : Firestore gère sa propre file d'attente.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Origines externes (Firestore, Google Auth, Storage…) : laissées intactes.
  if (url.origin !== self.location.origin) return;

  // Routes serveur : elles n'ont pas de sens hors ligne et ne doivent jamais être servies
  // depuis un cache — une réponse de paiement périmée serait pire que pas de réponse.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isPublicAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});
