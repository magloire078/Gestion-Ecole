
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { class_type as ClassType } from '@/lib/data-types';

export function useClasses(schoolId?: string | null, academicYear?: string) {
    const firestore = useFirestore();

    const classesQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;

        // Base query
        let q = query(
            collection(firestore, `ecoles/${schoolId}/classes`),
            orderBy('name', 'asc')
        );

        // Filter by academic year if provided
        if (academicYear) {
            q = query(
                collection(firestore, `ecoles/${schoolId}/classes`),
                where('academicYear', '==', academicYear),
                orderBy('name', 'asc')
            );
        }

        return q;
    }, [schoolId, firestore, academicYear]);

    const { data, loading, error } = useCollection(classesQuery);

    const classes = useMemo(() => {
        return data?.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ClassType & { id: string })) || [];
    }, [data]);

    const classesByNiveau = useMemo(() => {
        return classes.reduce((acc, classe) => {
            if (classe.niveauId) {
                if (!acc[classe.niveauId]) acc[classe.niveauId] = [];
                acc[classe.niveauId].push(classe);
            }
            return acc;
        }, {} as Record<string, (ClassType & { id: string })[]>);
    }, [classes]);

    return { classes, classesByNiveau, loading, error };
}
