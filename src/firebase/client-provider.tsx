'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { getFirebase } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// 1. Définir le type du contexte
export interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

// 2. Créer le contexte
const FirebaseContext = createContext<FirebaseContextValue | null>(null);

// 3. Créer le composant fournisseur principal
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // `useMemo` garantit que l'initialisation ne se produit qu'une seule fois.
  const firebaseContext = useMemo(() => getFirebase(), []);

  // Si le contexte n'est pas encore prêt (par exemple, lors du rendu serveur),
  // on ne rend rien ou un loader pour éviter les erreurs.
  if (!firebaseContext) {
    return null; 
  }

  return (
    <FirebaseContext.Provider value={firebaseContext}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

// 4. Créer les hooks pour consommer le contexte
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseClientProvider');
  }
  return context;
};

export const useFirebaseApp = () => useFirebase().firebaseApp;
export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
export const useStorage = () => useFirebase().storage;
