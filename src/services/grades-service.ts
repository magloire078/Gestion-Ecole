'use client';

import { doc, addDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { firebaseFirestore as db } from '@/firebase/config';

interface GradeData {
    schoolId: string;
    subject: string;
    type: 'Interrogation' | 'Devoir' | 'Composition Mensuelle' | 'Composition Nationale' | 'Composition de Zone';
    date: string;
    grade: number;
    coefficient: number;
}

interface GradeEntry extends GradeData {
    id: string;
    studentId: string;
    studentName?: string;
}

/**
 * Service for managing student grades in Firestore
 * Note: Grades are stored in a nested structure under each student:
 * /ecoles/{schoolId}/eleves/{studentId}/notes/{gradeId}
 */
export const GradesService = {
    /**
     * Create a new grade for a student
     */
    createGrade: async (schoolId: string, studentId: string, data: Omit<GradeData, 'schoolId'>) => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const gradesCollectionRef = collection(db, `ecoles/${schoolId}/eleves/${studentId}/notes`);
            const gradeData: GradeData = {
                ...data,
                schoolId,
            };
            const docRef = await addDoc(gradesCollectionRef, gradeData);
            return docRef.id;
        } catch (error) {
            console.error('Error creating grade:', error);
            throw error;
        }
    },

    /**
     * Update an existing grade
     */
    updateGrade: async (schoolId: string, studentId: string, gradeId: string, data: Partial<GradeData>) => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const gradeRef = doc(db, `ecoles/${schoolId}/eleves/${studentId}/notes/${gradeId}`);
            await updateDoc(gradeRef, data);
        } catch (error) {
            console.error('Error updating grade:', error);
            throw error;
        }
    },

    /**
     * Delete a grade (permanent deletion)
     */
    deleteGrade: async (schoolId: string, studentId: string, gradeId: string) => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const gradeRef = doc(db, `ecoles/${schoolId}/eleves/${studentId}/notes/${gradeId}`);
            await deleteDoc(gradeRef);
        } catch (error) {
            console.error('Error deleting grade:', error);
            throw error;
        }
    },

    /**
     * Get all grades for a specific subject across multiple students
     * This is used to fetch all grades for a class/subject combination
     */
    getGradesBySubject: async (schoolId: string, studentIds: string[], subject: string): Promise<GradeEntry[]> => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            if (studentIds.length === 0) return [];

            const allGrades: GradeEntry[] = [];

            // Fetch grades for each student
            for (const studentId of studentIds) {
                const gradesCollectionRef = collection(db, `ecoles/${schoolId}/eleves/${studentId}/notes`);
                const q = query(gradesCollectionRef, where('subject', '==', subject));
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach(doc => {
                    allGrades.push({
                        id: doc.id,
                        studentId,
                        ...doc.data()
                    } as GradeEntry);
                });
            }

            // Sort by date (most recent first)
            allGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return allGrades;
        } catch (error) {
            console.error('Error fetching grades by subject:', error);
            throw error;
        }
    },
};

// Export types for use in components
export type { GradeData, GradeEntry };
