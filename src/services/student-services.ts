
'use client';

import { doc, updateDoc, writeBatch, increment, serverTimestamp, addDoc, collection, deleteDoc } from "firebase/firestore";
import { firebaseFirestore as db } from '@/firebase/config';
import type { student as Student } from '@/lib/data-types';

const COLLECTION_NAME = 'eleves';

/**
 * Service for managing students in Firestore
 */
export const StudentService = {
    /**
     * Create a new student
     */
    createStudent: async (schoolId: string, data: Omit<Student, 'id'>) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            const docRef = await addDoc(collectionRef, {
                ...data,
                schoolId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating student:', error);
            throw error;
        }
    },

    /**
     * Update an existing student
     */
    updateStudent: async (schoolId: string, studentId: string, data: Partial<Student>) => {
        try {
            const studentRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${studentId}`);
            await updateDoc(studentRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating student:', error);
            throw error;
        }
    },

    /**
     * Delete a student (permanent deletion)
     */
    deleteStudent: async (schoolId: string, studentId: string) => {
        try {
            const studentRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${studentId}`);
            await deleteDoc(studentRef);
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    },

    /**
     * Update student photo URL
     */
    updateStudentPhoto: async (schoolId: string, studentId: string, photoUrl: string) => {
        if (!schoolId || !studentId) {
            throw new Error("L'ID de l'école et de l'élève sont requis.");
        }

        const studentRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${studentId}`);

        try {
            await updateDoc(studentRef, {
                photoURL: photoUrl,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error updating student photo:", error);
            throw error;
        }
    },

    /**
     * Archive a student (mark as "Radié" and decrement class count)
     */
    archiveStudent: async (schoolId: string, student: Student) => {
        if (!schoolId || !student || !student.id) {
            throw new Error("Les informations de l'école et de l'élève sont requises.");
        }

        const wasActive = ['Actif', 'En attente'].includes(student.status);

        const batch = writeBatch(db);
        const studentDocRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${student.id}`);

        batch.update(studentDocRef, {
            status: 'Radié',
            updatedAt: serverTimestamp(),
        });

        if (wasActive && student.classId) {
            const classDocRef = doc(db, `ecoles/${schoolId}/classes/${student.classId}`);
            batch.update(classDocRef, { studentCount: increment(-1) });
        }

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error archiving student:", error);
            throw error;
        }
    },

    /**
     * Restore a student (mark as "Actif" and increment class count)
     */
    restoreStudent: async (schoolId: string, student: Student) => {
        if (!schoolId || !student || !student.id) {
            throw new Error("Les informations de l'école et de l'élève sont requises.");
        }

        const wasArchived = !['Actif', 'En attente'].includes(student.status);

        const batch = writeBatch(db);
        const studentDocRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${student.id}`);
        batch.update(studentDocRef, {
            status: 'Actif',
            updatedAt: serverTimestamp(),
        });

        if (wasArchived && student.classId) {
            const classDocRef = doc(db, `ecoles/${schoolId}/classes/${student.classId}`);
            batch.update(classDocRef, { studentCount: increment(1) });
        }

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error restoring student:", error);
            throw error;
        }
    },
};

// Legacy exports for backward compatibility
export const updateStudentPhoto = StudentService.updateStudentPhoto;
export const archiveStudent = StudentService.archiveStudent;
export const restoreStudent = StudentService.restoreStudent;
