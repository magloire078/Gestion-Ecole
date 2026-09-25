'use client';

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  enableNetwork,
  Firestore,
  FirestoreSettings
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Configuration Firebase
// On utilise .trim() et on retire tout espace/retour à la ligne pour éviter les erreurs de copier-coller dans Vercel
const clean = (val: string | undefined) => val?.trim()?.replace(/[\s\n\r]/g, '') || '';

// authDomain = domaine courant de l'app (first-party) sur les environnements
// déployés. Combiné au proxy /__/auth/* de next.config.js, cela évite les
// cookies tiers et fait fonctionner la connexion Google sur mobile (le
// signInWithRedirect échouait silencieusement quand authDomain
// = greecole.firebaseapp.com différait du domaine de l'app). En SSR et en
// local (localhost), on retombe sur la variable d'environnement classique.
const resolveAuthDomain = () => {
  const envDomain = clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  if (typeof window === 'undefined') return envDomain;
  const host = window.location.host; // inclut le port éventuel
  const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])/.test(window.location.hostname);
  return isLocalhost || !host ? envDomain : host;
};

export const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: resolveAuthDomain(),
  projectId: clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "greecole.appspot.com"),
  messagingSenderId: clean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)
};

// Variables globales pour le client
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

// Initialisation de l'App (Singleton compatible SSR)
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialisation des Services.
// On protège getAuth/getStorage par try/catch : si les variables
// NEXT_PUBLIC_FIREBASE_* sont absentes au moment du build (ex. environnement
// Preview mal configuré), getAuth lève `auth/invalid-api-key` et fait échouer
// le pré-rendu de TOUTES les pages. Le garde-fou permet au build d'aboutir en
// mode dégradé ; en production (clés présentes) le comportement est identique.
// NB : sans les clés, l'app reste non fonctionnelle au runtime — ce garde-fou
// ne dispense pas de configurer les variables, il évite juste un build cassé.
try {
  auth = getAuth(app);
} catch (e) {
  console.error('[FirebaseConfig] getAuth a échoué (clés Firebase absentes au build ?) :', e);
  auth = undefined as unknown as Auth;
}
try {
  storage = getStorage(app, firebaseConfig.storageBucket);
} catch (e) {
  console.error('[FirebaseConfig] getStorage a échoué :', e);
  storage = undefined as unknown as FirebaseStorage;
}

// Initialisation Firestore (Gestion robuste du Singleton et du Cache)
if (typeof window !== 'undefined') {
  // Debug des variables d'environnement sur le client
  console.log("[FirebaseConfig] Initializing Firestore for project:", firebaseConfig.projectId);

  try {
    // On force le cache en mémoire pour éviter les erreurs "offline" liées à IndexedDB/Tabs
    // et on force le long-polling pour les réseaux restrictifs (évite QUIC_PROTOCOL_ERROR).
    // useFetchStreams: false => bascule sur le transport XHR historique, plus tolérant aux
    // proxys/réseaux d'entreprise stricts qui provoquent des 400 "WebChannel transport errored".
    // NB: useFetchStreams est bien lu par le SDK au runtime mais absent du type public
    // FirestoreSettings (firebase 11.9.0), d'où l'extension de type locale ci-dessous.
    const firestoreSettings: FirestoreSettings & { useFetchStreams?: boolean } = {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      ignoreUndefinedProperties: true,
    };
    firestore = initializeFirestore(app, firestoreSettings);
    console.log("[FirebaseConfig] Firestore initialized successfully with MemoryCache + LongPolling");
  } catch (e: any) {
    if (e.code === 'failed-precondition') {
      console.warn("[FirebaseConfig] Firestore already initialized, fetching existing instance.");
      firestore = getFirestore(app);
    } else {
      console.error("[FirebaseConfig] Unexpected Firestore init error. Falling back to default settings.", e);
      firestore = getFirestore(app);
    }
  }

  // Tentative proactive d'activer le réseau
  enableNetwork(firestore).catch(err => console.error("[FirebaseConfig] enableNetwork failed:", err));
} else {
  // Côté Serveur (SSR / build). Protégé par précaution : si la config est
  // incomplète au build, on ne fait pas échouer le pré-rendu.
  try {
    firestore = getFirestore(app);
  } catch (e) {
    console.error('[FirebaseConfig] getFirestore (serveur) a échoué :', e);
    firestore = undefined as unknown as Firestore;
  }
}

// Exports sécurisés
export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseFirestore = firestore;
export const firebaseStorage = storage;

export function getFirebase() {
  return {
    app: firebaseApp,
    auth: firebaseAuth,
    firestore: firebaseFirestore,
    storage: firebaseStorage
  };
}
