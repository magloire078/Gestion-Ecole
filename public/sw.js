// Service worker minimal : sert uniquement à satisfaire les critères
// d'installabilité (Android/Chrome exige un SW actif avec un handler
// 'fetch'). Volontairement sans cache : les données de l'app (élèves,
// notes, paiements...) sont sensibles et changent en permanence, un cache
// offline naïf ferait plus de mal (données obsolètes ou exposées sur un
// appareil partagé) qu'il n'aiderait. Toute requête part donc simplement
// au réseau, comme si le SW n'existait pas.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
