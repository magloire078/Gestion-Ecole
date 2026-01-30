
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
  const { toast } = useToast();

  useEffect(() => {
    // query est un objet, il n'est pas stable entre les rendus.
    // On pourrait sérialiser la requête pour la rendre stable, mais c'est complexe.
    // Pour l'instant, on se fie au fait que le composant parent utilise useMemo.
    if (!query) {
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
          description: "Impossible de charger les données: permissions insuffisantes ou erreur réseau.",
        });
        setData([]); // Clear data on error
        setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]); // La dépendance à firestore et toast peut causer des boucles si non mémoïsées.
  
  return {data: data || [], loading, error };
}
