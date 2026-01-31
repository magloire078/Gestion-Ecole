'use client';
import {useState, useEffect} from 'react';
import {
  getDocs,
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
    
    let isMounted = true;
    
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const snapshot = await getDocs(query);
            if (isMounted) {
                setData(snapshot.docs);
            }
        } catch (serverError: any) {
            if (isMounted) {
                console.error("useCollection Firestore Error:", serverError.message);
                setError(serverError);
                setData([]);
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };
    
    fetchData();

    return () => {
        isMounted = false;
    };
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  
  return {data: data || [], loading, error };
}
