
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { cycle as Cycle } from '@/lib/data-types';

export function useCycles(schoolId?: string | null) {
    const firestore = useFirestore();

    const cyclesQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;
        return query(
            collection(firestore, `ecoles/${schoolId}/cycles`),
            orderBy('order', 'asc')
        );
    }, [schoolId, firestore]);

    const { data, loading, error } = useCollection(cyclesQuery);

    const cycles = useMemo(() => {
        return data?.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Cycle & { id: string })) || [];
    }, [data]);

    return { cycles, loading, error };
}
