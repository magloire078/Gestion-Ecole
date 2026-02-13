'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { libraryBook as LibraryBook } from '@/lib/data-types';

/**
 * Hook to fetch library books from Firestore
 * @param schoolId - The school ID
 */
export function useLibraryBooks(schoolId?: string | null) {
    const firestore = useFirestore();

    const booksQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;
        return query(collection(firestore, `ecoles/${schoolId}/bibliotheque`));
    }, [schoolId, firestore]);

    const { data, loading, error } = useCollection(booksQuery);

    const books = useMemo(() => {
        return data?.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as LibraryBook & { id: string })) || [];
    }, [data]);

    return { books, loading, error };
}
