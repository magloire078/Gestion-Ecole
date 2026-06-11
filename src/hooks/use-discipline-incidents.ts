'use client';

import { useMemo, useState, useEffect } from 'react';
import { DisciplineService, type IncidentEntry } from '@/services/discipline-service';
import { useAcademicYear } from '@/providers/academic-year-provider';
import { filterByAcademicYear } from '@/lib/academic-year-utils';

/**
 * Hook to fetch discipline incidents across all students
 * @param schoolId - The school ID
 */
export function useDisciplineIncidents(schoolId?: string | null) {
    const [rawIncidents, setRawIncidents] = useState<IncidentEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { selectedYear, currentYear } = useAcademicYear();

    useEffect(() => {
        if (!schoolId) {
            setRawIncidents([]);
            setLoading(false);
            return;
        }

        const fetchIncidents = async () => {
            setLoading(true);
            setError(null);

            try {
                const fetchedIncidents = await DisciplineService.getAllIncidents(schoolId);
                setRawIncidents(fetchedIncidents);
            } catch (err) {
                console.error('Error fetching incidents:', err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchIncidents();
    }, [schoolId]);

    const incidents = useMemo(
        () => filterByAcademicYear(rawIncidents, selectedYear, currentYear),
        [rawIncidents, selectedYear, currentYear],
    );

    return { incidents, loading, error };
}
