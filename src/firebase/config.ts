'use client';

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  enableNetwork,
  Firestore,
  FirestoreSettings
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Configuration Firebase
// On utilise .trim() et on retire tout espace/retour à la ligne pour éviter les erreurs de copier-coller dans Vercel
const clean = (val: string | undefined) => val?.trim()?.replace(/[\s\n\r]/g, '') || '';

export const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
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

// Initialisation des Services
auth = getAuth(app);
storage = getStorage(app, firebaseConfig.storageBucket);

// Initialisation Firestore (Gestion robuste du Singleton et du Cache)
if (typeof window !== 'undefined') {
  // Debug des variables d'environnement sur le client
  console.log("[FirebaseConfig] Initializing Firestore for project:", firebaseConfig.projectId);

  // Réglages communs aux deux modes de cache. Le long-polling force le transport
  // XHR historique, plus tolérant aux réseaux restrictifs (évite QUIC_PROTOCOL_ERROR).
  const baseSettings: FirestoreSettings = {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  };

  try {
    // Cache persistant (IndexedDB) : c'est la condition du fonctionnement hors ligne.
    // Contrairement au cache mémoire, les données survivent au rechargement de la page
    // et à la fermeture de l'application, et les écritures effectuées sans réseau sont
    // conservées dans une file d'attente que le SDK rejoue automatiquement à la
    // reconnexion.
    // `persistentMultipleTabManager` permet à plusieurs onglets de partager la même base
    // IndexedDB : c'est ce qui évite le `failed-precondition` de l'ancienne API de
    // persistance, motif pour lequel le cache mémoire avait été retenu ici.
    firestore = initializeFirestore(app, {
      ...baseSettings,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    console.log("[FirebaseConfig] Firestore initialized successfully with PersistentCache (multi-tab) + LongPolling");
  } catch (e: any) {
    if (e.code === 'failed-precondition') {
      console.warn("[FirebaseConfig] Firestore already initialized, fetching existing instance.");
      firestore = getFirestore(app);
    } else {
      // Repli sur le cache mémoire : l'application reste utilisable en ligne, mais perd
      // le mode hors ligne. NB : si IndexedDB est simplement indisponible (navigation
      // privée, WebView restreinte), le SDK bascule lui-même en mémoire de façon
      // asynchrone sans passer par ce bloc.
      console.error("[FirebaseConfig] Persistent cache unavailable, falling back to memory cache (offline mode disabled).", e);
      try {
        firestore = initializeFirestore(app, {
          ...baseSettings,
          localCache: memoryLocalCache(),
        });
      } catch {
        firestore = getFirestore(app);
      }
    }
  }

  // Tentative proactive d'activer le réseau
  enableNetwork(firestore).catch(err => console.error("[FirebaseConfig] enableNetwork failed:", err));
} else {
  // Côté Serveur
  firestore = getFirestore(app);
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
