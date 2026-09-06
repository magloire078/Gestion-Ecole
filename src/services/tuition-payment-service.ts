import { Firestore, doc, collection, writeBatch, increment, getDoc } from 'firebase/firestore';
import type { student as Student, payment as Payment, accountingTransaction as Transaction } from '@/lib/data-types';

export interface RegisterPaymentData {
    amount: number;
    date: string;
    description: string;
    payerFirstName: string;
    payerLastName: string;
    payerContact: string;
    method: string;
    proofUrl?: string | null;
    academicYear: string;
}

export class TuitionPaymentService {
    /**
     * Enregistre un versement de scolarité de manière transactionnelle.
     * Met à jour : l'élève (amountDue, tuitionStatus), l'historique des paiements de l'élève, la comptabilité générale, et les stats globales.
     */
    static async registerPayment(
        firestore: Firestore,
        schoolId: string,
        student: Student & { id: string },
        paymentData: RegisterPaymentData
    ): Promise<{ receiptRef: string, transactionId: string }> {
        if (!schoolId || !student || !student.id || paymentData.amount <= 0) {
            throw new Error("Données manquantes ou montant invalide.");
        }

        // Vérifier si le montant dépasse le reste à payer
        const currentDue = student.amountDue || 0;
        if (paymentData.amount > currentDue) {
            throw new Error(`Le montant versé (${paymentData.amount}) dépasse le solde restant dû (${currentDue}).`);
        }

        const newAmountDue = Math.max(0, currentDue - paymentData.amount);
        const newStatus: "Soldé" | "Partiel" = newAmountDue <= 0 ? 'Soldé' : 'Partiel';

        const batch = writeBatch(firestore);

        // 1. Mettre à jour le dossier de l'élève
        const studentRef = doc(firestore, `ecoles/${schoolId}/eleves/${student.id}`);
        batch.update(studentRef, {
            amountDue: newAmountDue,
            tuitionStatus: newStatus,
            updatedAt: new Date().toISOString()
        });

        // 2. Enregistrer l'écriture dans la comptabilité
        const accountingColRef = collection(firestore, `ecoles/${schoolId}/comptabilite`);
        const newTransactionRef = doc(accountingColRef);
        const receiptRef = `REC-${Date.now().toString().slice(-6)}`;
        batch.set(newTransactionRef, {
            schoolId: schoolId,
            date: paymentData.date,
            description: paymentData.description,
            category: 'Scolarité',
            type: 'Revenu',
            amount: paymentData.amount,
            studentId: student.id,
            academicYear: paymentData.academicYear,
            method: paymentData.method,
            reference: receiptRef,
            payerFirstName: paymentData.payerFirstName,
            payerLastName: paymentData.payerLastName,
            createdAt: new Date().toISOString()
        });

        // 3. Enregistrer dans l'historique des paiements de l'élève
        const paymentHistoryRef = doc(collection(firestore, `ecoles/${schoolId}/eleves/${student.id}/paiements`));
        batch.set(paymentHistoryRef, {
            schoolId: schoolId,
            studentId: student.id,
            date: paymentData.date,
            amount: paymentData.amount,
            description: paymentData.description,
            accountingTransactionId: newTransactionRef.id, // Lien vers la comptabilité
            payerFirstName: paymentData.payerFirstName,
            payerLastName: paymentData.payerLastName,
            payerContact: paymentData.payerContact,
            method: paymentData.method,
            proofUrl: paymentData.proofUrl || null,
            academicYear: paymentData.academicYear,
            reference: receiptRef, // Référence optionnelle (utilisée dans l'onglet des paiements)
            createdAt: new Date().toISOString()
        });

        // 4. Mettre à jour les statistiques financières (optionnel, on incrémente totalAmountDue en négatif)
        const statsRef = doc(firestore, `ecoles/${schoolId}/stats/finance`);
        batch.set(statsRef, {
            totalAmountDue: increment(-paymentData.amount),
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        await batch.commit();

        return { receiptRef, transactionId: newTransactionRef.id };
    }

    /**
     * Annule un versement de scolarité de manière transactionnelle.
     * Supprime le versement et l'écriture comptable, et rajoute la dette à l'élève.
     */
    static async cancelPayment(
        firestore: Firestore,
        schoolId: string,
        payment: Payment & { id: string },
        transactionId?: string // Identifiant de l'écriture comptable si différent de l'id du paiement
    ): Promise<void> {
        if (!schoolId || !payment.id || !payment.studentId) {
            throw new Error("Informations du versement incomplètes pour l'annulation.");
        }

        const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${payment.studentId}`);
        const studentSnap = await getDoc(studentDocRef);

        if (!studentSnap.exists()) {
            throw new Error("L'élève rattaché à ce versement est introuvable.");
        }

        const studentData = studentSnap.data() as Student;
        const currentDue = studentData.amountDue || 0;
        const newDue = currentDue + payment.amount;

        const batch = writeBatch(firestore);

        // 1. Réajuster la dette de l'élève
        batch.update(studentDocRef, {
            amountDue: newDue,
            tuitionStatus: 'Partiel', // Il doit forcément rester de l'argent à payer
            updatedAt: new Date().toISOString()
        });

        // 2. Supprimer la ligne de paiement de l'historique de l'élève
        const paymentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${payment.studentId}/paiements/${payment.id}`);
        batch.delete(paymentDocRef);

        // 3. Supprimer l'écriture de caisse
        // Le transactionId peut être passé explicitement, ou stocké dans accountingTransactionId
        const targetTransactionId = transactionId || (payment as any).accountingTransactionId;
        if (targetTransactionId) {
            const transDocRef = doc(firestore, `ecoles/${schoolId}/comptabilite/${targetTransactionId}`);
            batch.delete(transDocRef);
        } else {
            // Rétrocompatibilité : Si pas de transactionId, on suppose que c'est la page Journal qui l'annule et on utilise payment.id
            const transDocRef = doc(firestore, `ecoles/${schoolId}/comptabilite/${payment.id}`);
            batch.delete(transDocRef);
        }

        // 4. Mettre à jour les statistiques
        const statsRef = doc(firestore, `ecoles/${schoolId}/stats/finance`);
        batch.set(statsRef, {
            totalAmountDue: increment(payment.amount),
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        await batch.commit();
    }
}
