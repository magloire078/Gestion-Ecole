'use client';

/**
 * Préférence personnelle de l'utilisateur pour l'affichage des rapports et
 * statistiques financiers/administratifs : année scolaire (par défaut) ou
 * année civile. Stockée sur `users/{uid}` (document racine du compte, déjà
 * utilisé pour `activeSchoolId`) afin de suivre l'utilisateur d'un
 * appareil/école à l'autre, plutôt que d'être un réglage par école.
 *
 * Les notes et bulletins ne consomment jamais cette préférence : ils
 * n'existent qu'en année scolaire (trimestres, classes).
 */
import { useCallback, useMemo } from 'react';
import { doc, updateDoc, type DocumentReference } from 'firebase/firestore';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { user_root } from '@/lib/data-types';

export type PeriodPreferenceType = 'academic' | 'calendar';

export function usePeriodPreference() {
    const firestore = useFirestore();
    const { user } = useUser();
    const uid = user?.uid;

    const userRootRef = useMemo(
        () => (uid ? (doc(firestore, 'users', uid) as DocumentReference<user_root>) : null),
        [firestore, uid],
    );
    const { data: userRoot, loading } = useDoc<user_root>(userRootRef);

    const periodType: PeriodPreferenceType = userRoot?.periodPreference || 'academic';
    const calendarYear = userRoot?.periodCalendarYear || new Date().getFullYear();

    const setPeriodType = useCallback((type: PeriodPreferenceType) => {
        if (!userRootRef) return;
        updateDoc(userRootRef, { periodPreference: type }).catch(err => {
            console.error('[usePeriodPreference] Échec de mise à jour de periodPreference:', err);
        });
    }, [userRootRef]);

    const setCalendarYear = useCallback((year: number) => {
        if (!userRootRef) return;
        updateDoc(userRootRef, { periodCalendarYear: year }).catch(err => {
            console.error('[usePeriodPreference] Échec de mise à jour de periodCalendarYear:', err);
        });
    }, [userRootRef]);

    return { periodType, calendarYear, setPeriodType, setCalendarYear, loading };
}
