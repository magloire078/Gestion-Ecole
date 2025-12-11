
import * as React from 'react';
import {initializeApp, getApp, getApps, FirebaseApp} from 'firebase/app';
import {getAuth, Auth} from 'firebase/auth';
import {getFirestore, Firestore, initializeFirestore, memoryLocalCache} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from "firebase/storage";
import {firebaseConfig} from './config';
export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-doc';
export * from './firestore/use-collection';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      // Use initializeFirestore for more granular control over settings
      firestore = initializeFirestore(app, {
        cache: memoryLocalCache(),
      });
      storage = getStorage(app);
    } else {
      app = getApp();
      auth = getAuth(app);
      // Ensure Firestore is also re-initialized or retrieved correctly
      firestore = getFirestore(app);
      storage = getStorage(app);
    }
    return {app, auth, firestore, storage};
  }
  
  return null;
}

export function getFirebase() {
    return initializeFirebase();
}

export function useMemoFirebase<T>(
  factory: () => T,
  deps: React.DependencyList
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(factory, deps);
}
