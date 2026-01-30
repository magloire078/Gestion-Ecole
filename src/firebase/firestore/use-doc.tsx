
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
import { useToast } from '@/hooks/use-toast';

type UseDocOptions = {
    onError?: (error: FirestoreError) => void;
}

export function useDoc<T>(ref: DocumentReference<T> | null, options?: UseDocOptions) {
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();


  useEffect(() => {
    // ref?.path est une dépendance plus stable que l'objet ref lui-même
    const stablePath = ref?.path;

    if (!stablePath || !firestore) {
        setData(null);
        setLoading(false);
        setError(null);
        return;
    }
    
    setData(null);
    setError(null);
    setLoading(true);

    const unsubscribe = onSnapshot(ref!, (snapshot) => {
      setData(snapshot.exists() ? snapshot.data() : null);
      setLoading(false);
    }, (err) => {
        console.error("useDoc Firestore Error:", err);
        setError(err);
        toast({
            variant: "destructive",
            title: "Erreur de chargement",
            description: `Impossible de charger le document: ${err.message}`,
        });
        if(options?.onError) {
            options.onError(err);
        }
        setData(null);
        setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref?.path]);

  return {data, loading, error};
}
