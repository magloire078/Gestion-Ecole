
'use client';
import {useState, useEffect} from 'react';
import {
  onSnapshot,
  doc,
  DocumentReference,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import {useFirestore} from '../client-provider';

type UseDocOptions = {
    onError?: (error: FirestoreError) => void;
}

export function useDoc<T>(ref: DocumentReference<T> | null, options?: UseDocOptions) {
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (!ref || !firestore) {
        setData(null);
        setLoading(false);
        setError(null);
        return;
    }
    
    setData(null);
    setError(null);
    setLoading(true);

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      setData(snapshot.exists() ? snapshot.data() : null);
      setLoading(false);
    }, (err) => {
        console.error("useDoc Firestore Error:", err);
        setError(err);
        if(options?.onError) {
            options.onError(err);
        }
        setData(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [ref?.path, firestore]); // Changed dependency to a stable string

  return {data, loading, error};
}
