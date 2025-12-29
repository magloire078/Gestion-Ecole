
'use client';

import { doc, updateDoc, Firestore } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

/**
 * Met à jour l'URL de la photo d'un membre du personnel dans Firestore.
 * @param firestore - L'instance de Firestore.
 * @param schoolId - L'ID de l'école.
 * @param staffId - L'ID du membre du personnel.
 * @param photoURL - La nouvelle URL de la photo.
 */
export const updateStaffPhoto = async (
    firestore: Firestore,
    schoolId: string,
    staffId: string,
    photoURL: string
): Promise<void> => {
    
    if (!schoolId || !staffId) {
        throw new Error("L'ID de l'école et du membre du personnel sont requis.");
    }
    
    const staffRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`);
    const dataToUpdate = { photoURL };

    return updateDoc(staffRef, dataToUpdate)
    .catch(error => {
        const permissionError = new FirestorePermissionError({
            path: staffRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate
        });
        errorEmitter.emit('permission-error', permissionError);
        // Rethrow the original error or the custom one if you want the caller to handle it too
        throw permissionError;
    });
};
