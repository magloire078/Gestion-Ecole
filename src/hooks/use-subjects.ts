import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { subject as Subject } from '@/lib/data-types';

export function useSubjects(schoolId?: string | null) {
    const firestore = useFirestore();

    const subjectsQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;
        return query(
            collection(firestore, `ecoles/${schoolId}/matieres`),
            orderBy('name', 'asc')
        );
    }, [schoolId, firestore]);

    const { data, loading, error } = useCollection(subjectsQuery);

    const subjects = useMemo(() => {
        return data?.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Subject & { id: string })) || [];
    }, [data]);

    return { subjects, loading, error };
}
