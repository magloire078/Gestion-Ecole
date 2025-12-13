
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
import {useFirestore} from '../provider';
import { FirestorePermissionError } from '../errors';
import { errorEmitter } from '../error-emitter';
import { useToast } from '@/hooks/use-toast';

export function useCollection<T>(query: Query<T> | null) {
  const [data, setData] = useState<QueryDocumentSnapshot<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  const { toast } = useToast();

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
        const path = (query as any)._query?.path?.segments.join('/') || 'unknown path';
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
  
  const add = (data: DocumentData): void => {
    if (!query) {
        toast({ variant: 'destructive', title: 'Erreur', description: "La requête n'est pas définie." });
        return;
    }
    const collRef = query.firestore.collection((query as any)._query.path.segments.join('/')) as CollectionReference<DocumentData>;
    
    addDoc(collRef, data)
    .then((docRef) => {
        // Opération réussie, le listener onSnapshot mettra à jour l'UI.
        // On peut afficher un toast si nécessaire.
    })
    .catch((serverError) => {
        const path = (query as any)._query?.path?.segments.join('/') || 'unknown path';
        const permissionError = new FirestorePermissionError({
            path: path,
            operation: 'create',
            requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  }


  return {data, loading, add };
}
