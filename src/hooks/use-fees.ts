'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { fee as Fee } from '@/lib/data-types';
import { useAcademicYear } from '@/providers/academic-year-provider';
import { filterByAcademicYear } from '@/lib/academic-year-utils';

/**
 * Hook to fetch fees from Firestore. Filtré par l'année actuellement
 * sélectionnée (les frais sans tag sont conservés sur l'année courante).
 */
export function useFees(schoolId?: string | null) {
    const firestore = useFirestore();
    const { selectedYear, currentYear } = useAcademicYear();

    const feesQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;
        return query(collection(firestore, `ecoles/${schoolId}/frais_scolarite`));
    }, [schoolId, firestore]);

    const { data, loading, error } = useCollection(feesQuery);

    const fees = useMemo(() => {
        const all = data?.map(doc => ({ id: doc.id, ...doc.data() } as Fee)) || [];
        return filterByAcademicYear(all, selectedYear, currentYear);
    }, [data, selectedYear, currentYear]);

    return { fees, loading, error };
}
