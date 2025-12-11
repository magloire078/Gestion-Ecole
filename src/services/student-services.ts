
'use client';

import { doc, updateDoc, Firestore } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

/**
 * Met à jour l'URL de la photo d'un élève dans Firestore.
 * @param firestore - L'instance de Firestore.
 * @param studentId - L'ID de l'élève.
 * @param photoUrl - La nouvelle URL de la photo.
 */
export const updateStudentPhoto = async (
    firestore: Firestore,
    studentId: string,
    photoUrl: string
): Promise<void> => {
    
    if (!studentId) {
        throw new Error("L'ID de l'élève est requis.");
    }
    
    const studentRef = doc(firestore, `eleves/${studentId}`);
    const dataToUpdate = { photoUrl };

    try {
        await updateDoc(studentRef, dataToUpdate);
    } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: studentRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate
        });
        errorEmitter.emit('permission-error', permissionError);
        // Rethrow the original error or the custom one if you want the caller to handle it too
        throw permissionError;
    }
};
