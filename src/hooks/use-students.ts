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
 * @param academicYear - Optional academic year to filter and map enrollments
 */
export function useStudents(schoolId?: string | null, classId?: string, status?: 'active' | 'archived' | 'all', academicYear?: string) {
    const firestore = useFirestore();

    const studentsQuery = useMemo(() => {
        if (!schoolId || !firestore) return null;

        let q = query(collection(firestore, `ecoles/${schoolId}/eleves`));

        // If academicYear is specified, we can't do a simple where('classId') on the root if classId changes per year.
        // We will fetch all and filter in memory, which is safer given the nested enrollments array.
        // But if academicYear is NOT specified, we can use the root classId for efficiency.
        if (classId && classId !== 'all' && !academicYear) {
            q = query(
                collection(firestore, `ecoles/${schoolId}/eleves`),
                where('classId', '==', classId)
            );
        }

        return q;
    }, [schoolId, firestore, classId, academicYear]);

    const { data, loading, error } = useCollection(studentsQuery);

    const students = useMemo(() => {
        let allStudents = data?.map(doc => {
            const studentData = doc.data();
            let student = {
                id: doc.id,
                ...studentData,
                photoURL: studentData.photoURL || studentData.photoUrl
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

        // Exclude students who didn't match the requested academic year
        if (academicYear) {
            allStudents = allStudents.filter(s => !(s as any)._exclude);
            
            // If class filtering was bypassed in the query due to academicYear, apply it here
            if (classId && classId !== 'all') {
                allStudents = allStudents.filter(s => s.classId === classId);
            }
        }

        // Filter by status if specified
        if (status === 'active') {
            return allStudents.filter(s => ['Actif', 'En attente', 'Nouveau', 'Promu', 'Redoublant'].includes(s.status));
        } else if (status === 'archived') {
            return allStudents.filter(s => !['Actif', 'En attente', 'Nouveau', 'Promu', 'Redoublant'].includes(s.status));
        }

        return allStudents;
    }, [data, status, academicYear, classId]);

    return { students, loading, error };
}

