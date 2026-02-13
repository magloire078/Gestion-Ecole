'use client';

import { useState, useEffect } from 'react';
import { AbsencesService, type AbsenceEntry } from '@/services/absences-service';

/**
 * Hook to fetch absences across all students
 * @param schoolId - The school ID
 * @param fromDate - Filter absences from this date (YYYY-MM-DD format)
 */
export function useAbsences(schoolId?: string | null, fromDate?: string) {
    const [absences, setAbsences] = useState<AbsenceEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!schoolId || !fromDate) {
            setAbsences([]);
            setLoading(false);
            return;
        }

        const fetchAbsences = async () => {
            setLoading(true);
            setError(null);

            try {
                const fetchedAbsences = await AbsencesService.getAllAbsences(schoolId, fromDate);
                setAbsences(fetchedAbsences);
            } catch (err) {
                console.error('Error fetching absences:', err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchAbsences();
    }, [schoolId, fromDate]);

    return { absences, loading, error };
}
