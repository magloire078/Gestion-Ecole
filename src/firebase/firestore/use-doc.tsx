
'use client';
import {useState, useEffect} from 'react';
import {
  getDoc,
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
    const stablePath = ref?.path;

    if (!stablePath || !firestore) {
        setData(null);
        setLoading(false);
        setError(null);
        return;
    }
    
    let isMounted = true;

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const snapshot = await getDoc(ref!);
            if (isMounted) {
                setData(snapshot.exists() ? snapshot.data() : null);
            }
        } catch (err: any) {
            if (isMounted) {
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
  }, [ref?.path]);

  return {data, loading, error};
}
