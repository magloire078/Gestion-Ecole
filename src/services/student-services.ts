
'use client';

import { doc, updateDoc, Firestore, writeBatch, increment } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import type { student as Student } from '@/lib/data-types';

/**
 * Met à jour l'URL de la photo d'un élève dans Firestore.
 * @param firestore - L'instance de Firestore.
 * @param schoolId - L'ID de l'école.
 * @param studentId - L'ID de l'élève.
 * @param photoUrl - La nouvelle URL de la photo.
 */
export const updateStudentPhoto = async (
    firestore: Firestore,
    schoolId: string,
    studentId: string,
    photoUrl: string
): Promise<void> => {
    
    if (!schoolId || !studentId) {
        throw new Error("L'ID de l'école et de l'élève sont requis.");
    }
    
    const studentRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentId}`);
    const dataToUpdate = { photoUrl: photoUrl };

    return updateDoc(studentRef, dataToUpdate).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: studentRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate
        });
        errorEmitter.emit('permission-error', permissionError);
        // Rethrow the original error or the custom one if you want the caller to handle it too
        throw permissionError;
    });
};


/**
 * Marque un élève comme "Radié" et décrémente le compteur de sa classe.
 */
export const archiveStudent = async (
    firestore: Firestore,
    schoolId: string,
    student: Student,
): Promise<void> => {
    if (!schoolId || !student || !student.id) {
        throw new Error("Les informations de l'école et de l'élève sont requises.");
    }

    const wasActive = ['Actif', 'En attente'].includes(student.status);

    const batch = writeBatch(firestore);
    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${student.id}`);
    
    batch.update(studentDocRef, { status: 'Radié' });

    if (wasActive && student.classId) {
        const classDocRef = doc(firestore, `ecoles/${schoolId}/classes/${student.classId}`);
        batch.update(classDocRef, { studentCount: increment(-1) });
    }

    return batch.commit().catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}/eleves/${student.id} and class update`,
            operation: 'update'
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
};

/**
 * Restaure un élève au statut "Actif" et incrémente le compteur de sa classe.
 */
export const restoreStudent = async (
    firestore: Firestore,
    schoolId: string,
    student: Student,
): Promise<void> => {
    if (!schoolId || !student || !student.id) {
        throw new Error("Les informations de l'école et de l'élève sont requises.");
    }

    const wasArchived = !['Actif', 'En attente'].includes(student.status);

    const batch = writeBatch(firestore);
    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${student.id}`);
    batch.update(studentDocRef, { status: 'Actif' });

    if (wasArchived && student.classId) {
        const classDocRef = doc(firestore, `ecoles/${schoolId}/classes/${student.classId}`);
        batch.update(classDocRef, { studentCount: increment(1) });
    }

    return batch.commit().catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}/eleves/${student.id}`,
            operation: 'update'
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
};
