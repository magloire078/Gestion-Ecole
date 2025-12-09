'use client';

import {ReactNode, useMemo} from 'react';
import {FirebaseProvider, FirebaseContextValue} from './provider';
import { getFirebase } from '.';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const firebaseContext = useMemo(() => getFirebase(), []);

  if (!firebaseContext) {
    // This can happen during server-side rendering, return null or a loader.
    return null;
  }

  return <FirebaseProvider value={firebaseContext}>{children}</FirebaseProvider>;
}
