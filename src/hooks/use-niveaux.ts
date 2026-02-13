
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { niveau as Niveau } from '@/lib/data-types';

export function useNiveaux(schoolId?: string | null) {
    const firestore = useFirestore();

    const niveauxQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;
        return query(
            collection(firestore, `ecoles/${schoolId}/niveaux`),
            orderBy('order', 'asc')
        );
    }, [schoolId, firestore]);

    const { data, loading, error } = useCollection(niveauxQuery);

    const niveaux = useMemo(() => {
        return data?.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Niveau & { id: string })) || [];
    }, [data]);

    const niveauxByCycle = useMemo(() => {
        return niveaux.reduce((acc, niveau) => {
            if (niveau.cycleId) {
                if (!acc[niveau.cycleId]) acc[niveau.cycleId] = [];
                acc[niveau.cycleId].push(niveau);
            }
            return acc;
        }, {} as Record<string, (Niveau & { id: string })[]>);
    }, [niveaux]);

    return { niveaux, niveauxByCycle, loading, error };
}
