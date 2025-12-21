
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
export const deleteSchool = async (
    firestore: Firestore,
    schoolId: string,
    adminId: string,
): Promise<void> => {
    
    if (!schoolId) {
        throw new Error("L'ID de l'école est requis pour la suppression.");
    }
     if (!adminId) {
        throw new Error("L'ID de l'administrateur est requis pour la journalisation.");
    }
    
    const schoolRef = doc(firestore, `ecoles/${schoolId}`);
    const logRef = doc(collection(firestore, 'system_logs'));

    const batch = writeBatch(firestore);

    // Étape 1: Créer le log d'audit
    batch.set(logRef, {
        adminId: adminId,
        action: 'school.soft-deleted',
        target: schoolRef.path,
        details: { schoolId: schoolId, status: 'deleted' },
        ipAddress: 'N/A (client-side)',
        timestamp: serverTimestamp(),
    });
    
    // Étape 2: Mettre à jour l'école pour la marquer comme supprimée
    batch.update(schoolRef, {
      status: 'deleted',
      deletedAt: serverTimestamp()
    });

    return batch.commit().catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH] ${schoolRef.path}`,
            operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
        // Rethrow pour que l'appelant puisse aussi gérer l'erreur
        throw permissionError;
    });
};


/**
 * Restaure une école marquée comme "supprimée".
 * @param firestore - L'instance de Firestore.
 * @param schoolId - L'ID de l'école à restaurer.
 * @param adminId - L'ID de l'administrateur qui effectue l'action.
 */
export const restoreSchool = async (
    firestore: Firestore,
    schoolId: string,
    adminId: string,
): Promise<void> => {
    if (!schoolId) {
        throw new Error("L'ID de l'école est requis pour la restauration.");
    }
    if (!adminId) {
        throw new Error("L'ID de l'administrateur est requis pour la journalisation.");
    }

    const schoolRef = doc(firestore, `ecoles/${schoolId}`);
    const logRef = doc(collection(firestore, 'system_logs'));
    
    const batch = writeBatch(firestore);

    // Étape 1: Créer le log d'audit pour la restauration
    batch.set(logRef, {
        adminId: adminId,
        action: 'school.restored',
        target: schoolRef.path,
        details: { schoolId: schoolId, status: 'active' },
        ipAddress: 'N/A (client-side)',
        timestamp: serverTimestamp(),
    });

    // Étape 2: Restaurer l'école en changeant son statut et en supprimant la date de suppression
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
    
