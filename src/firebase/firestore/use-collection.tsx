
'use client';
import {useState, useEffect} from 'react';
import {
  onSnapshot,
  collection,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  addDoc,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import {useFirestore} from '../client-provider';
import { FirestorePermissionError } from '../errors';
import { errorEmitter } from '../error-emitter';
import { useToast } from '@/hooks/use-toast';

export function useCollection<T>(query: Query<T> | null) {
  const [data, setData] = useState<QueryDocumentSnapshot<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!query || !firestore) {
      setData([]); // Return empty array instead of null
      setLoading(false);
      return;
    }
    
    setLoading(true); // Set loading to true when a new query comes in

    const unsubscribe = onSnapshot(query, (snapshot) => {
      setData(snapshot.docs);
      setLoading(false);
    }, async (serverError) => {
        let path = 'unknown_path'; // Default value
        try {
            // This is an internal property, but it's the most reliable way to get path info.
            const internalQuery = (query as any)?._query;
            if (internalQuery) {
                if (internalQuery.path?.segments?.length > 0) {
                    path = internalQuery.path.segments.join('/');
                } else if (internalQuery.collectionGroup) {
                    path = `collectionGroup: ${internalQuery.collectionGroup}`;
                }
            } else if ((query as any).path) {
                // This might catch cases where the query is a direct CollectionReference
                path = (query as any).path;
            }
        } catch (e) {
            console.error("Could not determine path for FirestorePermissionError", e);
        }

        const permissionError = new FirestorePermissionError({
            path: path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setData([]); // Return empty array on error
        setLoading(false);
    });

    return () => unsubscribe();
  }, [query, firestore]);
  
  return {data: data || [], loading };
}
