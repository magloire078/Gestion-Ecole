
'use client';
import {useState, useEffect} from 'react';
import {
  onSnapshot,
  DocumentReference,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';

type UseDocOptions = {
    onError?: (error: FirestoreError) => void;
}

export function useDoc<T>(ref: DocumentReference<T> | null, options?: UseDocOptions) {
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

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
        setError(null);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error("useDoc Firestore Error:", err);
        setError(err);
        if(options?.onError) {
            options.onError(err);
        }
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref?.path]);

  return {data, loading, error};
}
