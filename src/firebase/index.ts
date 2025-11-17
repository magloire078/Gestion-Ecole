import * as React from 'react';
import {initializeApp, getApp, getApps, FirebaseApp} from 'firebase/app';
import {getAuth, Auth, connectAuthEmulator} from 'firebase/auth';
import {getFirestore, Firestore} from 'firebase/firestore';
import {firebaseConfig} from './config';
export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-doc';
export * from './firestore/use-collection';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      firestore = getFirestore(app);

      // Connect to emulators in development
      if (process.env.NODE_ENV === 'development') {
        // Pointing to the Auth emulator
        connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      }

    } else {
      app = getApp();
      auth = getAuth(app);
      firestore = getFirestore(app);
    }
    return {app, auth, firestore};
  }
  
  throw new Error("Cannot initialize firebase on the server.");
}

export function getFirebase() {
    if (typeof window === "undefined") {
        return null;
    }
    const { app, auth, firestore } = initializeFirebase();
    return { app, auth, firestore };
}

export function useMemoFirebase<T>(
  factory: () => T,
  deps: React.DependencyList
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(factory, deps);
}
