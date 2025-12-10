
'use client';
import {useState, useEffect} from 'react';
import {
  onSnapshot,
  doc,
  DocumentReference,
  DocumentData,
} from 'firebase/firestore';
import {useFirestore} from '../provider';
import { FirestorePermissionError } from '../errors';
import { errorEmitter } from '../error-emitter';

export function useDoc<T>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!ref || !firestore) {
        setData(null);
        setLoading(false);
        return;
    }

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      setData(snapshot.exists() ? snapshot.data() : null);
      setLoading(false);
    }, async (error) => {
        const permissionError = new FirestorePermissionError({
            path: ref.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setData(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [ref, firestore]);

  return {data, loading};
}
