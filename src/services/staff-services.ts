
'use client';

import { doc, updateDoc, Firestore, writeBatch, getDoc, arrayRemove, collection, addDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import type { user_root } from "@/lib/data-types";

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

/**
 * Supprime un membre du personnel d'une école et met à jour son document utilisateur racine.
 */
export const deleteStaffMember = async (
    firestore: Firestore,
    schoolId: string,
    staffId: string,
    role: string,
): Promise<void> => {
    if (!schoolId || !staffId) {
        throw new Error("L'ID de l'école et du membre du personnel sont requis.");
    }
    
    const staffRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`);
    const userRootRef = doc(firestore, `users/${staffId}`);

    const batch = writeBatch(firestore);

    // 1. Delete staff profile from school subcollection
    batch.delete(staffRef);

    // 2. Update user's root document to remove school affiliation
    const userRootSnap = await getDoc(userRootRef);
    if (userRootSnap.exists()) {
        const userData = userRootSnap.data() as user_root;
        
        // Find the specific school object to remove, as arrayRemove needs an exact match.
        const schoolToRemove = (userData.schools || []).find(s => s.schoolId === schoolId);

        if (schoolToRemove) {
            const updateData: { [key: string]: any } = {
                schools: arrayRemove(schoolToRemove)
            };

            // If the active school is the one being removed, update it
            if (userData.activeSchoolId === schoolId) {
                 const otherSchools = (userData.schools || []).filter(s => s.schoolId !== schoolId);
                 updateData.activeSchoolId = otherSchools.length > 0 ? otherSchools[0].schoolId : null;
            }
            batch.update(userRootRef, updateData);
        }
    }
    
    return batch.commit().catch(error => {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH] ${staffRef.path} & ${userRootRef.path}`,
            operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
};
