
import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { timetableEntry } from '@/lib/data-types';

export function useTimetable(schoolId?: string | null, classId?: string) {
    const firestore = useFirestore();

    const timetableQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;
        let q = query(collection(firestore, `ecoles/${schoolId}/emploi_du_temps`));

        if (classId && classId !== 'all') {
            q = query(collection(firestore, `ecoles/${schoolId}/emploi_du_temps`), where('classId', '==', classId));
        }

        return q;
    }, [schoolId, firestore, classId]);

    const { data, loading, error } = useCollection(timetableQuery);

    const timetable = useMemo(() => {
        return data?.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as timetableEntry)) || [];
    }, [data]);

    return { timetable, loading, error };
}
