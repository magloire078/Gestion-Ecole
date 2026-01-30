
'use client';

import { doc, updateDoc, Firestore, writeBatch, getDoc, deleteField, collection } from "firebase/firestore";
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
    photoUrl: string
): Promise<void> => {
    
    if (!schoolId || !staffId) {
        throw new Error("L'ID de l'école et de l'élève sont requis.");
    }
    
    const staffRef = doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`);
    const dataToUpdate = { photoURL: photoUrl };

    return updateDoc(staffRef, dataToUpdate);
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
        
        const updateData: { [key: string]: any } = {
            [`schools.${schoolId}`]: deleteField()
        };

        // If the active school is the one being removed, find a new one to set as active.
        if (userData.activeSchoolId === schoolId) {
             const remainingSchoolIds = Object.keys(userData.schools || {}).filter(id => id !== schoolId);
             updateData.activeSchoolId = remainingSchoolIds.length > 0 ? remainingSchoolIds[0] : null;
        }
        batch.update(userRootRef, updateData);
    }
    
    return batch.commit();
};
