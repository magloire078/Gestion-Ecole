'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { fee as Fee } from '@/lib/data-types';

/**
 * Hook to fetch fees from Firestore
 * @param schoolId - The school ID
 */
export function useFees(schoolId?: string | null) {
    const firestore = useFirestore();

    const feesQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;
        return query(collection(firestore, `ecoles/${schoolId}/frais_scolarite`));
    }, [schoolId, firestore]);

    const { data, loading, error } = useCollection(feesQuery);

    const fees = useMemo(() => {
        return data?.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Fee)) || [];
    }, [data]);

    return { fees, loading, error };
}
