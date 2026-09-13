'use client';

import { useMemo, useState } from 'react';
import { doc, type DocumentReference, type DocumentData } from 'firebase/firestore';
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { student as Student } from '@/lib/data-types';
import { createCheckoutLink } from '@/services/payment-service';

export function useTuitionPayment(studentId: string | null) {
    const { user, schoolId, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const studentRef = useMemo(() =>
        (schoolId && studentId) ? doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`) as DocumentReference<Student, DocumentData> : null,
        [firestore, schoolId, studentId]);

    const settingsRef = useMemo(() => doc(firestore, 'system_settings/default'), [firestore]);

    const { data: student, loading: studentLoading } = useDoc<Student>(studentRef);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);

    const [amountToPay, setAmountToPay] = useState<number>(0);
    const [isLoadingProvider, setIsLoadingProvider] = useState<null | 'genius'>(null);
    const [error, setError] = useState<string | null>(null);

    // Réinitialise le montant proposé au solde dû dès qu'il change (chargement
    // initial du document élève), sans effet séparé qui provoquerait un
    // second rendu — cf. https://react.dev/learn/you-might-not-need-an-effect
    const [lastSyncedAmountDue, setLastSyncedAmountDue] = useState<number | null>(null);
    if (student?.amountDue && student.amountDue !== lastSyncedAmountDue) {
        setLastSyncedAmountDue(student.amountDue);
        setAmountToPay(student.amountDue);
    }

    const amountDue = student?.amountDue || 0;
    const isValidAmount = amountToPay > 0 && amountToPay <= amountDue;

    const handlePayment = async (provider: 'genius') => {
        setError(null);

        if (!student || !user || !schoolId || !studentId) {
            setError("Impossible de lancer le paiement. Données manquantes.");
            return;
        }
        if (!isValidAmount) {
            setError(amountToPay <= 0
                ? "Le montant doit être supérieur à zéro."
                : `Le montant ne peut pas dépasser le solde dû (${amountDue}).`);
            return;
        }

        setIsLoadingProvider(provider);
        const { url, error: serviceError } = await createCheckoutLink(provider, {
            type: 'tuition',
            amount: amountToPay.toString(),
            description: `Paiement scolarité pour ${student.firstName} ${student.lastName}`,
            user: user.authUser!,
            schoolId,
            studentId,
        });

        if (url) {
            window.location.href = url;
        } else {
            setError(serviceError);
            setIsLoadingProvider(null);
        }
    };

    return {
        student,
        settingsData,
        isLoading: userLoading || studentLoading || settingsLoading,
        amountToPay,
        setAmountToPay,
        amountDue,
        isValidAmount,
        isLoadingProvider,
        error,
        handlePayment,
    };
}
