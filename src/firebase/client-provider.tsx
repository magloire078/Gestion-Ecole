

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { firebaseApp, firebaseAuth, firebaseFirestore, firebaseStorage } from './config';
import { ThemeProvider } from '@/components/theme-provider';

export interface FirebaseContextValue {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  storage: FirebaseStorage | null;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  firebaseApp: null,
  auth: null,
  firestore: null,
  storage: null,
});

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const contextValue = {
    firebaseApp,
    auth: firebaseAuth,
    firestore: firebaseFirestore,
    storage: firebaseStorage,
  };

  return (
    <FirebaseContext.Provider value={contextValue}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </FirebaseContext.Provider>
  );
}

export const useFirebase = (): FirebaseContextValue => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseClientProvider');
  }
  // On s'assure que les services sont disponibles avant de les retourner
  if (!context.auth || !context.firestore || !context.storage) {
    if (typeof window !== 'undefined') {
        // This case should ideally not happen if provider logic is correct
        console.warn("Firebase services are not yet available.");
    }
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().firebaseApp!;
export const useAuth = () => useFirebase().auth!;
export const useFirestore = () => useFirebase().firestore!;
export const useStorage = () => useFirebase().storage!;
