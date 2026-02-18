'use client';
import { useState, useEffect } from 'react';
import {
  onSnapshot,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';

export interface UseCollectionOptions {
  name?: string;
  onError?: (err: FirestoreError) => void;
}

export function useCollection<T>(query: Query<T> | null, options?: UseCollectionOptions) {
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
      (err: FirestoreError) => {
        let queryInfo = 'unknown';
        if (query) {
          // Attempt to extract useful info from the query object
          const q = query as any;
          queryInfo = q.path || (q._query && q._query.path && q._query.path.segments.join('/')) || 'complex-query';
        }
        const prefix = options?.name ? `[${options.name}] ` : '';
        console.error(`useCollection Firestore Error ${prefix}[${queryInfo}]:`, err.code, err.message);

        setError(err);
        if (options?.onError) {
          options.onError(err);
        }
        setData([]);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      try {
        unsubscribe();
      } catch (e) {
        console.warn("useCollection: Failed to unsubscribe safely:", e);
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return { data: data || [], loading, error };
}
