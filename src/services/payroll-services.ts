'use client';

import { Firestore, collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { staff as Staff } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RunPayrollResult {
    success: boolean;
    runId?: string;
    error?: string;
}

export const runPayrollForMonth = async (
    firestore: Firestore,
    schoolId: string,
    adminId: string,
    adminName: string
): Promise<RunPayrollResult> => {
    
    if (!schoolId || !adminId) {
        return { success: false, error: "Informations sur l'école ou l'administrateur manquantes." };
    }

    const staffWithSalaryQuery = query(
        collection(firestore, `ecoles/${schoolId}/personnel`),
        where('baseSalary', '>', 0),
        where('status', '==', 'Actif')
    );

    try {
        const staffSnapshot = await getDocs(staffWithSalaryQuery);
        
        if (staffSnapshot.empty) {
            return { success: false, error: "Aucun employé avec un salaire défini à traiter." };
        }

        const staffMembers = staffSnapshot.docs.map(doc => doc.data() as Staff);
        const totalMass = staffMembers.reduce((sum, staff) => sum + (staff.baseSalary || 0), 0);
        const employeeCount = staffMembers.length;
        
        const period = format(new Date(), 'MMMM yyyy', { locale: fr });

        // Check if payroll has already been run for this period
        const payrollRunsQuery = query(
            collection(firestore, `ecoles/${schoolId}/payroll_runs`),
            where('period', '==', period)
        );
        const existingRunSnapshot = await getDocs(payrollRunsQuery);
        if (!existingRunSnapshot.empty) {
            return { success: false, error: `La paie pour ${period} a déjà été exécutée.` };
        }

        const batch = writeBatch(firestore);

        const newRunRef = doc(collection(firestore, `ecoles/${schoolId}/payroll_runs`));
        
        const payrollRunData = {
            period,
            executionDate: new Date().toISOString(),
            totalMass,
            employeeCount,
            status: 'Terminé',
            processedBy: adminId,
            processedByName: adminName,
        };

        batch.set(newRunRef, payrollRunData);

        await batch.commit();

        return { success: true, runId: newRunRef.id };

    } catch (error) {
        console.error("Erreur lors de l'exécution de la paie:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `ecoles/${schoolId}/payroll_runs`,
            operation: 'write'
        }));
        return { success: false, error: "Une erreur de permission est survenue." };
    }
};
