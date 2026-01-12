
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAmhQB4yUoskfJIoBme4OStNkpGzXUxR7c",
  authDomain: "greecole.firebaseapp.com",
  projectId: "greecole",
  storageBucket: "greecole.appspot.com",
  messagingSenderId: "97019754371",
  appId: "1:97019754371:web:4822d9c017bf4be808e8b6"
};

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

function getFirebaseInstances() {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, firestore: null, storage: null };
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Utiliser initializeFirestore pour configurer le cache mémoire
    firestore = initializeFirestore(app, {
        localCache: memoryLocalCache(),
    });
    storage = getStorage(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);
  }
  return { app, auth, firestore, storage };
}

const instances = getFirebaseInstances();
export const firebaseApp = instances.app;
export const firebaseAuth = instances.auth;
export const firebaseFirestore = instances.firestore;
export const firebaseStorage = instances.storage;
