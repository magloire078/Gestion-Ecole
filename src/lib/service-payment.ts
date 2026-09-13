import { collection, doc, type Firestore } from 'firebase/firestore';
import { resolveAcademicYearForWrite } from '@/lib/academic-year-utils';

/**
 * Prépare une écriture comptable (Revenu) pour un paiement de service
 * annexe (cantine, transport, internat...). Ne fait qu'allouer une
 * référence de document ; à ajouter à un writeBatch existant avec
 * `batch.set(ref, data)` pour rester atomique avec l'écriture qui
 * déclenche le paiement (réservation, abonnement...).
 */
export function prepareServicePaymentTransaction(
    firestore: Firestore,
    schoolId: string,
    params: {
        category: string;
        description: string;
        amount: number;
        date: string;
        studentId?: string;
        schoolCurrentYear?: string;
    },
) {
    const ref = doc(collection(firestore, `ecoles/${schoolId}/comptabilite`));
    const data = {
        schoolId,
        date: params.date,
        description: params.description,
        category: params.category,
        type: 'Revenu' as const,
        amount: params.amount,
        studentId: params.studentId,
        academicYear: resolveAcademicYearForWrite({
            schoolCurrentYear: params.schoolCurrentYear,
            docDate: params.date,
        }),
        createdAt: new Date().toISOString(),
    };
    return { ref, data };
}
