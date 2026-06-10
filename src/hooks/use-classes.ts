
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { class_type as ClassType } from '@/lib/data-types';
import { useAcademicYear } from '@/providers/academic-year-provider';

/**
 * Récupère les classes d'une école.
 *
 * Si `academicYear` n'est pas fourni, on utilise l'année actuellement
 * sélectionnée dans le contexte (par défaut l'année courante de l'école).
 * Passe explicitement `null` pour ne pas filtrer.
 */
export function useClasses(schoolId?: string | null, academicYear?: string | null) {
    const firestore = useFirestore();
    const { selectedYear } = useAcademicYear();
    const effectiveYear = academicYear === null
        ? undefined
        : (academicYear ?? selectedYear);

    const classesQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;

        if (effectiveYear) {
            return query(
                collection(firestore, `ecoles/${schoolId}/classes`),
                where('academicYear', '==', effectiveYear),
                orderBy('name', 'asc'),
            );
        }
        return query(
            collection(firestore, `ecoles/${schoolId}/classes`),
            orderBy('name', 'asc'),
        );
    }, [schoolId, firestore, effectiveYear]);

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
