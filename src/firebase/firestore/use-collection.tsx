'use client';
import {useState, useEffect} from 'react';
import {
  onSnapshot,
  collection,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import {useFirestore} from '../provider';
import { FirestorePermissionError } from '../errors';
import { errorEmitter } from '../error-emitter';

export function useCollection<T>(query: Query<T> | null) {
  const [data, setData] = useState<QueryDocumentSnapshot<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!query || !firestore) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(query, (snapshot) => {
      setData(snapshot.docs);
      setLoading(false);
    }, async (error) => {
        const permissionError = new FirestorePermissionError({
            path: (query as any)._query.path.segments.join('/'),
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setData(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [query, firestore]);

  return {data, loading};
}
