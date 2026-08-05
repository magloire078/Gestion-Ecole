
'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  DocumentReference,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';

type UseDocOptions = {
  onError?: (error: FirestoreError) => void;
}


export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null, options?: UseDocOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  // Voir useCollection : `fromCache` signale une lecture servie localement (hors ligne),
  // `hasPendingWrites` une écriture locale pas encore confirmée par le serveur.
  const [fromCache, setFromCache] = useState(false);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(ref,
      (snapshot) => {
        setData(snapshot.exists() ? snapshot.data() : null);
        setFromCache(snapshot.metadata.fromCache);
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setError(null);
        setLoading(false);
      },
      (err: FirestoreError) => {
        const docPath = ref ? (ref as any).path : 'unknown';
        console.error(`useDoc Firestore Error [${docPath}]:`, err.code, err.message);
        setError(err);
        if (options?.onError) {
          options.onError(err);
        }
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref?.path]);

  return { data, loading, error, fromCache, hasPendingWrites };
}

