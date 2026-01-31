'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';

export function useCollection<T>(query: Query<T> | null) {
  const [data, setData] = useState<QueryDocumentSnapshot<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);

    const unsubscribe = onSnapshot(query, 
      (snapshot) => {
        setData(snapshot.docs);
        setError(null);
        setLoading(false);
      }, 
      (err) => {
        console.error("useCollection Firestore Error:", err.message);
        setError(err);
        setData([]);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  
  return { data: data || [], loading, error };
}
