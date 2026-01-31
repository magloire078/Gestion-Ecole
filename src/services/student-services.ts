
'use client';

import { doc, updateDoc, Firestore, writeBatch, increment, serverTimestamp, collection, getDocs, query, where, deleteField } from "firebase/firestore";
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
    const dataToUpdate = { photoURL: photoUrl };

    return updateDoc(studentRef, dataToUpdate).catch((serverError) => {
        console.error("Error updating student photo:", serverError);
        throw serverError;
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

    return batch.commit().catch(serverError => {
        console.error("Error archiving student:", serverError);
        throw serverError;
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

    return batch.commit().catch(serverError => {
        console.error("Error restoring student:", serverError);
        throw serverError;
    });
};
