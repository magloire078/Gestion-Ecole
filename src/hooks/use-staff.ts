import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { staff as Staff } from '@/lib/data-types';

export function useStaff(schoolId?: string | null) {
    const firestore = useFirestore();

    const staffQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;
        return query(
            collection(firestore, `ecoles/${schoolId}/personnel`),
            orderBy('lastName', 'asc')
        );
    }, [schoolId, firestore]);

    const { data, loading, error } = useCollection(staffQuery);

    const staff = useMemo(() => {
        return data?.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Staff & { id: string })) || [];
    }, [data]);

    return { staff, loading, error };
}
