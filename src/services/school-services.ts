
'use client';

import { doc, deleteDoc, Firestore } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

/**
 * Supprime un document d'école de Firestore.
 * NOTE: Cette fonction ne supprime pas les sous-collections (élèves, personnel, etc.).
 * Celles-ci deviendront inaccessibles mais ne seront pas supprimées. Une suppression
 * complète nécessiterait une Cloud Function.
 *
 * @param firestore - L'instance de Firestore.
 * @param schoolId - L'ID de l'école à supprimer.
 */
export const deleteSchool = async (
    firestore: Firestore,
    schoolId: string
): Promise<void> => {
    
    if (!schoolId) {
        throw new Error("L'ID de l'école est requis pour la suppression.");
    }
    
    const schoolRef = doc(firestore, `ecoles/${schoolId}`);

    return deleteDoc(schoolRef).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: schoolRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        // Rethrow pour que l'appelant puisse aussi gérer l'erreur
        throw permissionError;
    });
};
