'use client';

import { useState, useEffect } from 'react';
import { DisciplineService, type IncidentEntry } from '@/services/discipline-service';

/**
 * Hook to fetch discipline incidents across all students
 * @param schoolId - The school ID
 */
export function useDisciplineIncidents(schoolId?: string | null) {
    const [incidents, setIncidents] = useState<IncidentEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!schoolId) {
            setIncidents([]);
            setLoading(false);
            return;
        }

        const fetchIncidents = async () => {
            setLoading(true);
            setError(null);

            try {
                const fetchedIncidents = await DisciplineService.getAllIncidents(schoolId);
                setIncidents(fetchedIncidents);
            } catch (err) {
                console.error('Error fetching incidents:', err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchIncidents();
    }, [schoolId]);

    return { incidents, loading, error };
}
