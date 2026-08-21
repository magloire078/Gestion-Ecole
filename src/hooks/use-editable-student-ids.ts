'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, limit as fbLimit, orderBy, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
    getEffectiveEditableStudentLimit,
    isSubscriptionEffectivelyActive,
    type SubscriptionGuardInput,
} from '@/lib/subscription-guards';

interface EditableStudentIdsResult {
    /** true si l'abonnement n'est plus effectivement actif (compte basculé sur le plan Essentiel). */
    isLimited: boolean;
    /** IDs des élèves modifiables/consultables (les N premiers par date d'inscription). `null` tant que non chargé ou si aucune limite ne s'applique. */
    editableStudentIds: Set<string> | null;
    loading: boolean;
}

/**
 * Détermine, quand un abonnement expiré bascule un compte sur le plan
 * Essentiel, quels élèves restent modifiables/consultables : les premiers
 * inscrits (par `createdAt` croissant) jusqu'à la limite du plan. Les autres
 * restent visibles dans les listes mais leur fiche est verrouillée.
 */
export function useEditableStudentIds(
    schoolId: string | null | undefined,
    subscription: SubscriptionGuardInput | null | undefined,
): EditableStudentIdsResult {
    const firestore = useFirestore();
    const isLimited = !isSubscriptionEffectivelyActive(subscription);
    const [editableStudentIds, setEditableStudentIds] = useState<Set<string> | null>(null);
    const [loading, setLoading] = useState(isLimited);

    const plan = subscription?.plan;
    const status = subscription?.status;
    const endDate = subscription?.endDate;
    const pastDueSince = subscription?.pastDueSince;

    useEffect(() => {
        if (!isLimited || !schoolId || !firestore) {
            setEditableStudentIds(null);
            setLoading(false);
            return;
        }

        const maxStudents = getEffectiveEditableStudentLimit({ plan, status, endDate, pastDueSince });
        if (!Number.isFinite(maxStudents)) {
            setEditableStudentIds(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        const q = query(
            collection(firestore, `ecoles/${schoolId}/eleves`),
            orderBy('createdAt', 'asc'),
            fbLimit(maxStudents),
        );

        getDocs(q)
            .then(snap => {
                if (cancelled) return;
                setEditableStudentIds(new Set(snap.docs.map(d => d.id)));
            })
            .catch(err => {
                console.error('[useEditableStudentIds] query failed', err);
                if (!cancelled) setEditableStudentIds(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [isLimited, schoolId, firestore, plan, status, endDate, pastDueSince]);

    return { isLimited, editableStudentIds, loading };
}
