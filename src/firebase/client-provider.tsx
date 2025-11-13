'use client';

import {ReactNode, useMemo} from 'react';
import {FirebaseProvider, FirebaseContextValue} from './provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
  value: FirebaseContextValue
}

export function FirebaseClientProvider({
  children,
  value,
}: FirebaseClientProviderProps) {
  const memoizedValue = useMemo(() => value, [value]);
  return <FirebaseProvider value={memoizedValue}>{children}</FirebaseProvider>;
}
