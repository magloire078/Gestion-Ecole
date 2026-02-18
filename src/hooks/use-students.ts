'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { student as Student } from '@/lib/data-types';

/**
 * Hook to fetch students from Firestore
 * @param schoolId - The school ID
 * @param classId - Optional class ID to filter by
 * @param status - Optional status filter ('active', 'archived', or 'all')
 */
export function useStudents(schoolId?: string | null, classId?: string, status?: 'active' | 'archived' | 'all') {
    const firestore = useFirestore();

    const studentsQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;

        let q = query(collection(firestore, `ecoles/${schoolId}/eleves`));

        // Filter by class if specified
        if (classId && classId !== 'all') {
            q = query(
                collection(firestore, `ecoles/${schoolId}/eleves`),
                where('classId', '==', classId)
            );
        }

        return q;
    }, [schoolId, firestore, classId]);

    const { data, loading, error } = useCollection(studentsQuery);

    const students = useMemo(() => {
        const allStudents = data?.map(doc => {
            const studentData = doc.data();
            return {
                id: doc.id,
                ...studentData,
                photoURL: studentData.photoURL || studentData.photoUrl
            } as Student;
        }) || [];

        // Filter by status if specified
        if (status === 'active') {
            return allStudents.filter(s => ['Actif', 'En attente'].includes(s.status));
        } else if (status === 'archived') {
            return allStudents.filter(s => !['Actif', 'En attente'].includes(s.status));
        }

        return allStudents;
    }, [data, status]);

    return { students, loading, error };
}
