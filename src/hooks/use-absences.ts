'use client';

import { useMemo, useState, useEffect } from 'react';
import { AbsencesService, type AbsenceEntry } from '@/services/absences-service';
import { useAcademicYear } from '@/providers/academic-year-provider';
import { filterByAcademicYear } from '@/lib/academic-year-utils';

/**
 * Hook to fetch absences across all students
 * @param schoolId - The school ID
 * @param fromDate - Filter absences from this date (YYYY-MM-DD format)
 */
export function useAbsences(schoolId?: string | null, fromDate?: string) {
    const [rawAbsences, setRawAbsences] = useState<AbsenceEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { selectedYear, currentYear } = useAcademicYear();

    useEffect(() => {
        if (!schoolId || !fromDate) {
            setRawAbsences([]);
            setLoading(false);
            return;
        }

        const fetchAbsences = async () => {
            setLoading(true);
            setError(null);

            try {
                const fetchedAbsences = await AbsencesService.getAllAbsences(schoolId, fromDate);
                setRawAbsences(fetchedAbsences);
            } catch (err) {
                console.error('Error fetching absences:', err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchAbsences();
    }, [schoolId, fromDate]);

    const absences = useMemo(
        () => filterByAcademicYear(rawAbsences, selectedYear, currentYear),
        [rawAbsences, selectedYear, currentYear],
    );

    return { absences, loading, error };
}
