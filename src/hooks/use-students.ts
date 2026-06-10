'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    collection,
    documentId,
    getDocs,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { student as Student, studentClassAssignment as Assignment } from '@/lib/data-types';
import { useAcademicYear } from '@/providers/academic-year-provider';

/**
 * Hook to fetch students from Firestore.
 *
 * - Sans `classId` (ou `classId === 'all'`) → tous les élèves de l'école.
 * - Avec `classId` et `academicYear` (par défaut : année sélectionnée) →
 *   on passe par la collection `inscriptions_classe` pour reconstituer la
 *   liste historique : élèves dont l'affectation `active` à `classId`
 *   pour `academicYear` existe. Cela permet d'obtenir la composition d'une
 *   classe à n'importe quelle année passée, indépendamment du `classId`
 *   courant stocké sur le doc élève.
 * - Avec `classId` mais `academicYear === null` → fallback historique :
 *   filtre direct sur `student.classId` (legacy avant la généralisation
 *   des affectations).
 */
export function useStudents(
    schoolId?: string | null,
    classId?: string,
    status?: 'active' | 'archived' | 'all',
    academicYear?: string | null,
) {
    const firestore = useFirestore();
    const { selectedYear } = useAcademicYear();
    const effectiveYear = academicYear === null
        ? null
        : (academicYear ?? selectedYear);

    const useAssignmentJoin = !!classId && classId !== 'all' && !!effectiveYear;

    // --- Cas 1 : liste par jointure via inscriptions_classe ---
    const [assignmentStudents, setAssignmentStudents] = useState<Student[]>([]);
    const [assignmentLoading, setAssignmentLoading] = useState(false);
    const [assignmentError, setAssignmentError] = useState<Error | null>(null);

    useEffect(() => {
        if (!useAssignmentJoin || !schoolId || !firestore) {
            setAssignmentStudents([]);
            setAssignmentLoading(false);
            return;
        }
        const assignmentsQuery = query(
            collection(firestore, `ecoles/${schoolId}/inscriptions_classe`),
            where('classeId', '==', classId),
            where('academicYear', '==', effectiveYear),
            where('status', '==', 'active'),
        );

        setAssignmentLoading(true);
        const unsubscribe = onSnapshot(
            assignmentsQuery,
            async snap => {
                try {
                    const ids = Array.from(new Set(
                        snap.docs.map(d => (d.data() as Assignment).studentId),
                    )).filter(Boolean);
                    if (ids.length === 0) {
                        setAssignmentStudents([]);
                        setAssignmentLoading(false);
                        return;
                    }
                    // Firestore "in" supporte jusqu'à 30 valeurs — on découpe par batch.
                    const chunks: string[][] = [];
                    for (let i = 0; i < ids.length; i += 30) {
                        chunks.push(ids.slice(i, i + 30));
                    }
                    const all: Student[] = [];
                    for (const chunk of chunks) {
                        const studentsSnap = await getDocs(query(
                            collection(firestore, `ecoles/${schoolId}/eleves`),
                            where(documentId(), 'in', chunk),
                        ));
                        studentsSnap.forEach(doc => {
                            const data = doc.data();
                            all.push({
                                id: doc.id,
                                ...data,
                                photoURL: data.photoURL || data.photoUrl,
                            } as Student);
                        });
                    }
                    setAssignmentStudents(all);
                    setAssignmentError(null);
                } catch (err) {
                    console.error('[useStudents] join error', err);
                    setAssignmentError(err as Error);
                } finally {
                    setAssignmentLoading(false);
                }
            },
            err => {
                setAssignmentError(err as Error);
                setAssignmentLoading(false);
            },
        );
        return () => unsubscribe();
    }, [useAssignmentJoin, schoolId, firestore, classId, effectiveYear]);

    // --- Cas 2 : query directe (toute l'école ou legacy par classId) ---
    const directQuery = useMemo(() => {
        if (useAssignmentJoin || !schoolId || !firestore) return null;
        if (classId && classId !== 'all') {
            return query(
                collection(firestore, `ecoles/${schoolId}/eleves`),
                where('classId', '==', classId),
            );
        }
        return query(collection(firestore, `ecoles/${schoolId}/eleves`));
    }, [useAssignmentJoin, schoolId, firestore, classId]);

    const { data: directData, loading: directLoading, error: directError } = useCollection(directQuery);

    const directStudents = useMemo(() => {
        return directData?.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                photoURL: data.photoURL || data.photoUrl,
            } as Student;

            // If an academic year is specified, try to find the matching enrollment
            if (academicYear) {
                const enrollments = student.enrollments || [];
                const enrollment = enrollments.find(e => e.academicYear === academicYear);
                
                if (enrollment) {
                    // Override root properties with the enrollment specifics for this year
                    student = {
                        ...student,
                        classId: enrollment.classId,
                        tuitionFee: enrollment.tuitionFee,
                        amountDue: enrollment.amountDue,
                        tuitionStatus: enrollment.tuitionStatus,
                        status: enrollment.status === 'Radié' || enrollment.status === 'Transféré' ? 'Radié' : 'Actif'
                    };
                } else {
                    // STRICT FILTERING: If the student has no enrollment for the requested year, exclude them.
                    (student as any)._exclude = true;
                }
            }

            return student;
        }) || [];
    }, [directData]);

    const students = useMemo(() => {
        const base = useAssignmentJoin ? assignmentStudents : directStudents;
        if (status === 'active') {
            return base.filter(s => ['Actif', 'En attente'].includes(s.status));
        }
        if (status === 'archived') {
            return base.filter(s => !['Actif', 'En attente'].includes(s.status));
        }
        return base;
    }, [useAssignmentJoin, assignmentStudents, directStudents, status]);

    const loading = useAssignmentJoin ? assignmentLoading : directLoading;
    const error = useAssignmentJoin ? assignmentError : (directError as Error | null);

    return { students, loading, error };
}

