// Deux cibles de compilation partagent ce fichier :
//
//  - le build web (par défaut), déployé sur Vercel, qui sert aussi les routes API ;
//  - le build mobile (MOBILE_EXPORT=1), un export statique dont Capacitor embarque les
//    fichiers dans les applications Android/iOS, condition d'un démarrage sans réseau.
//
// `output: 'export'` refuse tout gestionnaire de route. Plutôt que de réécrire les 22
// routes API ailleurs, on les nomme `route.api.ts` et on retire l'extension `api.ts` de
// `pageExtensions` côté mobile : Next cesse alors de les considérer comme des routes.
// Ces routes ne servent de toute façon que des usages exigeant le réseau (paiements,
// webhooks, back-office) — le noyau hors ligne repose uniquement sur Firestore.
const isMobileExport = process.env.MOBILE_EXPORT === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isMobileExport ? 'export' : undefined,
  pageExtensions: isMobileExport
    ? ['ts', 'tsx', 'js', 'jsx']
    : ['ts', 'tsx', 'js', 'jsx', 'api.ts'],
  // Sert les pages depuis un répertoire (`/notes/index.html`), ce que la WebView résout
  // correctement là où une URL sans barre finale échouerait.
  trailingSlash: isMobileExport,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/greecole.firebasestorage.app/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'www.pigroup360.com',
        pathname: '**',
      },
    ],
  },
  // ATTENTION à la fusion de la PR #15 : elle ajoute une fonction `redirects()` (apex
  // gerecole.com → www). `output: 'export'` ne supporte pas les redirections, et elles
  // n'ont aucun sens dans une application embarquée. À la fusion, conditionner le bloc :
  //   ...(isMobileExport ? {} : { async redirects() { … } }),
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('firebase-admin');
    }
    return config;
  },
};

module.exports = nextConfig;
