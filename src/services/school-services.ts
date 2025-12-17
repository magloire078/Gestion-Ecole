
'use client';

import { doc, deleteDoc, writeBatch, collection, serverTimestamp, Firestore } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

/**
 * Supprime un document d'école de Firestore et enregistre l'action dans les logs système.
 * NOTE: Cette fonction ne supprime pas les sous-collections (élèves, personnel, etc.).
 * Celles-ci deviendront inaccessibles mais ne seront pas supprimées. Une suppression
 * complète nécessiterait une Cloud Function.
 *
 * @param firestore - L'instance de Firestore.
 * @param schoolId - L'ID de l'école à supprimer.
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
        action: 'school.deleted',
        target: schoolRef.path,
        details: { schoolId: schoolId },
        ipAddress: 'N/A (client-side)',
        timestamp: serverTimestamp(),
    });
    
    // Étape 2: Supprimer l'école
    batch.delete(schoolRef);

    return batch.commit().catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH] ${schoolRef.path}`,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        // Rethrow pour que l'appelant puisse aussi gérer l'erreur
        throw permissionError;
    });
};
