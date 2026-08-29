/** @type {import('next').NextConfig} */
const nextConfig = {
  output: undefined,
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
  // Force le domaine canonique : toute requête vers l'apex gerecole.com est
  // redirigée (308) vers www.gerecole.com. Sans cela, une page chargée sur
  // l'apex fait des appels API relatifs qui subissent la redirection apex→www
  // de Vercel en pleine requête, devenant cross-origin et bloqués par CORS
  // (ex. /api/gateway/create-link pour les paiements). En redirigeant dès le
  // document HTML, le navigateur reste toujours sur www et les appels API
  // restent same-origin.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'gerecole.com' }],
        destination: 'https://www.gerecole.com/:path*',
        permanent: true,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('firebase-admin');
    }
    return config;
  },
  // Proxy du gestionnaire d'authentification Firebase sur NOTRE domaine.
  // Objectif : rendre l'auth Google « first-party » pour qu'elle fonctionne sur
  // mobile (Safari/Chrome bloquent les cookies tiers, ce qui casse
  // signInWithRedirect quand authDomain = greecole.firebaseapp.com diffère du
  // domaine de l'app). En servant /__/auth/* depuis le domaine courant et en
  // réglant authDomain sur ce même domaine (voir src/firebase/config.ts), les
  // cookies de session redeviennent first-party. Voir la doc Firebase
  // « redirect-best-practices » (self-hosting du helper de connexion).
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://greecole.firebaseapp.com/__/auth/:path*',
      },
      {
        source: '/__/firebase/:path*',
        destination: 'https://greecole.firebaseapp.com/__/firebase/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
