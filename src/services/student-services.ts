
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
    createStudent: async (schoolId: string, data: Omit<Student, 'id'>, userId?: string) => {
        try {
            const batch = writeBatch(db);
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            const newStudentRef = doc(collectionRef);

            const studentData = {
                ...data,
                id: newStudentRef.id,
                schoolId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: userId || 'system',
            };

            batch.set(newStudentRef, studentData);

            // Update Class Count if classId provided
            if (data.classId) {
                const classRef = doc(db, `ecoles/${schoolId}/classes/${data.classId}`);
                batch.update(classRef, { studentCount: increment(1) });
            }

            // Update Finance Stats
            const statsRef = doc(db, `ecoles/${schoolId}/stats/finance`);
            batch.set(statsRef, {
                totalTuitionFees: increment(data.tuitionFee || 0),
                totalAmountDue: increment(data.amountDue || 0),
                studentCount: increment(1),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            await batch.commit();
            return newStudentRef.id;
        } catch (error) {
            console.error('Error creating student:', error);
            throw error;
        }
    },

    /**
     * Update an existing student
     */
    updateStudent: async (schoolId: string, studentId: string, data: Partial<Student>, previousData?: Student) => {
        try {
            const batch = writeBatch(db);
            const studentRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${studentId}`);

            batch.update(studentRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });

            // If finance fields changed and previousData is provided, calculate and update stats
            if (previousData && (data.tuitionFee !== undefined || data.amountDue !== undefined)) {
                const diffFee = (data.tuitionFee ?? previousData.tuitionFee ?? 0) - (previousData.tuitionFee ?? 0);
                const diffDue = (data.amountDue ?? previousData.amountDue ?? 0) - (previousData.amountDue ?? 0);

                if (diffFee !== 0 || diffDue !== 0) {
                    const statsRef = doc(db, `ecoles/${schoolId}/stats/finance`);
                    batch.set(statsRef, {
                        totalTuitionFees: increment(diffFee),
                        totalAmountDue: increment(diffDue),
                        lastUpdated: serverTimestamp()
                    }, { merge: true });
                }
            }

            // Handle class change if previousData provided
            if (previousData && data.classId && data.classId !== previousData.classId) {
                if (previousData.classId) {
                    const oldClassRef = doc(db, `ecoles/${schoolId}/classes/${previousData.classId}`);
                    batch.update(oldClassRef, { studentCount: increment(-1) });
                }
                const newClassRef = doc(db, `ecoles/${schoolId}/classes/${data.classId}`);
                batch.update(newClassRef, { studentCount: increment(1) });
            }

            await batch.commit();
        } catch (error) {
            console.error('Error updating student:', error);
            throw error;
        }
    },

    /**
     * Delete a student (permanent deletion)
     */
    deleteStudent: async (schoolId: string, student: Student) => {
        try {
            const batch = writeBatch(db);
            const studentRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${student.id}`);

            batch.delete(studentRef);

            // Decrement stats
            const statsRef = doc(db, `ecoles/${schoolId}/stats/finance`);
            batch.set(statsRef, {
                totalTuitionFees: increment(-(student.tuitionFee || 0)),
                totalAmountDue: increment(-(student.amountDue || 0)),
                studentCount: increment(-1),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // Decrement class count
            if (student.classId) {
                const classRef = doc(db, `ecoles/${schoolId}/classes/${student.classId}`);
                batch.update(classRef, { studentCount: increment(-1) });
            }

            await batch.commit();
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
