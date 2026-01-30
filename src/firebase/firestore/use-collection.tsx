'use client';
import {useState, useEffect} from 'react';
import {
  onSnapshot,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import {useFirestore} from '../client-provider';

export function useCollection<T>(query: Query<T> | null) {
  const [data, setData] = useState<QueryDocumentSnapshot<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (!query || !firestore) {
      setData([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(query, (snapshot) => {
      setData(snapshot.docs);
      setLoading(false);
    }, (serverError: FirestoreError) => {
        console.error("useCollection Firestore Error:", serverError);
        setError(serverError);
        setData([]);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [query, firestore]);
  
  return {data: data || [], loading, error };
}
