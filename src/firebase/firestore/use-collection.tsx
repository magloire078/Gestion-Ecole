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
import { useToast } from '@/hooks/use-toast';

export function useCollection<T>(query: Query<T> | null) {
  const [data, setData] = useState<QueryDocumentSnapshot<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

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
        console.error("useCollection Firestore Error:", serverError.message);
        setError(serverError);
        toast({
            variant: "destructive",
            title: "Erreur de chargement",
            description: "Impossible de charger les données. Vérifiez vos permissions ou votre connexion."
        });
        setData([]);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [query, firestore, toast]);
  
  return {data: data || [], loading, error };
}
