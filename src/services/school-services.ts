
'use client';

import { doc, writeBatch, serverTimestamp, Firestore, updateDoc, deleteField, collection } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

/**
 * Marque une école comme "supprimée" (soft delete) dans Firestore et enregistre l'action dans les logs système.
 * @param firestore - L'instance de Firestore.
 * @param schoolId - L'ID de l'école à marquer comme supprimée.
 * @param adminId - L'ID de l'administrateur qui effectue l'action.
 */
export const deleteSchool = (
    firestore: Firestore,
    schoolId: string,
    adminId: string,
): Promise<void> => {
    
    if (!schoolId) {
        return Promise.reject(new Error("L'ID de l'école est requis pour la suppression."));
    }
     if (!adminId) {
        return Promise.reject(new Error("L'ID de l'administrateur est requis pour la journalisation."));
    }
    
    const schoolRef = doc(firestore, `ecoles/${schoolId}`);
    const logRef = doc(collection(firestore, 'system_logs'));

    const batch = writeBatch(firestore);
    
    const logData = {
        adminId: adminId,
        action: 'school.soft-deleted',
        target: schoolRef.path,
        details: { schoolId: schoolId, status: 'deleted' },
        ipAddress: 'N/A (client-side)',
        timestamp: new Date().toISOString(),
    };
    batch.set(logRef, logData);
    
    const schoolUpdate = {
      status: 'deleted',
      deletedAt: new Date().toISOString()
    };
    batch.update(schoolRef, schoolUpdate);

    return batch.commit().catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH] ${schoolRef.path}`,
            operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
};


/**
 * Restaure une école marquée comme "supprimée".
 * @param firestore - L'instance de Firestore.
 * @param schoolId - L'ID de l'école à restaurer.
 * @param adminId - L'ID de l'administrateur qui effectue l'action.
 */
export const restoreSchool = (
    firestore: Firestore,
    schoolId: string,
    adminId: string,
): Promise<void> => {
    if (!schoolId) {
       return Promise.reject(new Error("L'ID de l'école est requis pour la restauration."));
    }
    if (!adminId) {
        return Promise.reject(new Error("L'ID de l'administrateur est requis pour la journalisation."));
    }

    const schoolRef = doc(firestore, `ecoles/${schoolId}`);
    const logRef = doc(collection(firestore, 'system_logs'));
    
    const batch = writeBatch(firestore);

    batch.set(logRef, {
        adminId: adminId,
        action: 'school.restored',
        target: schoolRef.path,
        details: { schoolId: schoolId, status: 'active' },
        ipAddress: 'N/A (client-side)',
        timestamp: new Date().toISOString(),
    });

    batch.update(schoolRef, {
      status: 'active',
      deletedAt: deleteField() 
    });

    return batch.commit().catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH] ${schoolRef.path}`,
            operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
};
    
