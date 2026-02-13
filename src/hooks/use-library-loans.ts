'use client';

import { useMemo } from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { libraryLoan as LibraryLoan } from '@/lib/data-types';

/**
 * Hook to fetch library loans from Firestore
 * @param schoolId - The school ID
 * @param status - Optional status filter ('borrowed' | 'returned' | 'all')
 */
export function useLibraryLoans(schoolId?: string | null, status?: 'borrowed' | 'returned' | 'all') {
    const firestore = useFirestore();

    const loansQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;

        let q = query(
            collection(firestore, `ecoles/${schoolId}/bibliotheque_prets`),
            orderBy('borrowedDate', 'desc')
        );

        // Filter by status if specified
        if (status && status !== 'all') {
            q = query(
                collection(firestore, `ecoles/${schoolId}/bibliotheque_prets`),
                where('status', '==', status),
                orderBy('borrowedDate', 'desc')
            );
        }

        return q;
    }, [schoolId, firestore, status]);

    const { data, loading, error } = useCollection(loansQuery);

    const loans = useMemo(() => {
        return data?.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as LibraryLoan & { id: string })) || [];
    }, [data]);

    return { loans, loading, error };
}
