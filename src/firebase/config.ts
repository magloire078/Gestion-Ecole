'use client';

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Configuration Firebase
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "greecole.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
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
  // Côté Client : On tente de récupérer l'instance existante ou on initialise
  try {
    firestore = getFirestore(app);
  } catch (e) {
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager() // On garde pour l'instant mais on s'assure qu'une seule init a lieu
      })
    });
  }
} else {
  // Côté Serveur : Instance simple sans cache
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
