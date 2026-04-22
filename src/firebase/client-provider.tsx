'use client';

import { createContext, useContext, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { firebaseApp, firebaseAuth, firebaseFirestore } from './config';
import { ThemeProvider } from '@/components/theme-provider';

export interface FirebaseContextValue {
  firebaseApp: FirebaseApp | null | undefined;
  auth: Auth | null | undefined;
  firestore: Firestore | null | undefined;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  firebaseApp: undefined,
  auth: undefined,
  firestore: undefined,
});

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const contextValue: FirebaseContextValue = {
    firebaseApp,
    auth: firebaseAuth,
    firestore: firebaseFirestore,
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
  if (!context.auth || !context.firestore) {
    if (typeof window !== 'undefined') {
      console.warn("Firebase services are not yet available.");
    }
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().firebaseApp!;
export const useAuth = () => useFirebase().auth!;
export const useFirestore = () => useFirebase().firestore!;
