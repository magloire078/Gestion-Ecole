'use client';

import { useState, useEffect } from 'react';
import { GradesService, type GradeEntry } from '@/services/grades-service';

interface Student {
    id: string;
    firstName: string;
    lastName: string;
}

/**
 * Hook to fetch grades for a specific subject across multiple students
 * @param schoolId - The school ID
 * @param students - Array of students to fetch grades for
 * @param subject - The subject to filter by
 */
export function useGrades(schoolId?: string | null, students?: Student[], subject?: string | null) {
    const [grades, setGrades] = useState<GradeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!schoolId || !students || students.length === 0 || !subject) {
            setGrades([]);
            setLoading(false);
            return;
        }

        const fetchGrades = async () => {
            setLoading(true);
            setError(null);

            try {
                const studentIds = students.map(s => s.id);
                const fetchedGrades = await GradesService.getGradesBySubject(schoolId, studentIds, subject);

                // Enrich grades with student names
                const enrichedGrades = fetchedGrades.map(grade => {
                    const student = students.find(s => s.id === grade.studentId);
                    return {
                        ...grade,
                        studentName: student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu',
                    };
                });

                setGrades(enrichedGrades);
            } catch (err) {
                console.error('Error fetching grades:', err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchGrades();
    }, [schoolId, students, subject]);

    return { grades, loading, error };
}
