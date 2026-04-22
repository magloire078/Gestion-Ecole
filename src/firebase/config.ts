'use client';

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  enableNetwork,
  Firestore
} from 'firebase/firestore';

// Configuration Firebase
// On utilise .trim() et on retire tout espace/retour à la ligne pour éviter les erreurs de copier-coller dans Vercel
const clean = (val: string | undefined) => val?.trim()?.replace(/[\s\n\r]/g, '') || '';

export const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  messagingSenderId: clean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)
};

// Variables globales pour le client
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// Initialisation de l'App (Singleton compatible SSR)
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialisation des Services
auth = getAuth(app);

// Initialisation Firestore (Gestion robuste du Singleton et du Cache)
if (typeof window !== 'undefined') {
  // Debug des variables d'environnement sur le client
  console.log("[FirebaseConfig] Initializing Firestore for project:", firebaseConfig.projectId);

  try {
    // On force le cache en mémoire pour éviter les erreurs "offline" liées à IndexedDB/Tabs
    // et on force le long-polling pour les réseaux restrictifs (évite QUIC_PROTOCOL_ERROR)
    firestore = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    });
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
  // Côté Serveur
  firestore = getFirestore(app);
}

// Exports sécurisés
export const firebaseApp = app;
export const firebaseAuth = auth;
export const firebaseFirestore = firestore;

export function getFirebase() {
  return {
    app: firebaseApp,
    auth: firebaseAuth,
    firestore: firebaseFirestore,
  };
}
