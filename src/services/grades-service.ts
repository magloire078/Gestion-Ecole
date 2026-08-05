'use client';

import { doc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, getDoc } from "firebase/firestore";
import { firebaseFirestore as db } from '@/firebase/config';
import { commitWrite, reportSyncError, type WriteOutcome } from '@/lib/offline-writes';
import { NotificationService } from "@/services/notification-service";
import { student as Student } from "@/lib/data-types";
import { resolveAcademicYearForWrite } from "@/lib/academic-year-utils";

interface GradeData {
    schoolId: string;
    subject: string;
    type: 'Interrogation' | 'Devoir' | 'Composition Mensuelle' | 'Composition Nationale' | 'Composition de Zone';
    date: string;
    grade: number;
    coefficient: number;
    academicYear?: string;
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
            // Hors ligne, `getDoc` sert le cache persistant. Si l'école n'y a jamais été
            // chargée, la lecture échoue : on retombe alors sur la déduction par date
            // plutôt que de bloquer la saisie de la note.
            let schoolCurrentYear: string | undefined;
            try {
                const schoolSnap = await getDoc(doc(db, `ecoles/${schoolId}`));
                schoolCurrentYear = schoolSnap.data()?.currentAcademicYear;
            } catch (readError) {
                console.warn('[GradesService] École indisponible (hors ligne ?), année scolaire déduite de la date.', readError);
            }
            const academicYear = data.academicYear ?? resolveAcademicYearForWrite({
                schoolCurrentYear,
                docDate: data.date,
            });
            const gradesCollectionRef = collection(db, `ecoles/${schoolId}/eleves/${studentId}/notes`);
            const gradeRef = doc(gradesCollectionRef);
            const gradeData: GradeData = {
                ...data,
                schoolId,
                academicYear,
            };
            const outcome = await commitWrite(setDoc(gradeRef, gradeData), "création d'une note");

            // Notification aux parents : volontairement détachée du retour utilisateur.
            // Hors ligne, ces écritures rejoignent la file d'attente et partiront à la
            // reconnexion — les attendre bloquerait l'enseignant après coup.
            void GradesService.notifyParentsOfGrade(schoolId, studentId, data);

            return { id: gradeRef.id, outcome };
        } catch (error) {
            console.error('Error creating grade:', error);
            throw error;
        }
    },

    /**
     * Prévient les parents qu'une note a été saisie.
     *
     * Détachée de `createGrade` : aucune de ces écritures ne doit retarder le retour à
     * l'enseignant, et un échec de notification ne doit jamais faire échouer la note.
     */
    notifyParentsOfGrade: async (schoolId: string, studentId: string, data: Omit<GradeData, 'schoolId'>) => {
        try {
            if (!db) return;
            const studentDoc = await getDoc(doc(db, `ecoles/${schoolId}/eleves/${studentId}`));
            if (!studentDoc.exists()) return;
            const student = studentDoc.data() as Student;
            if (!student.parentIds?.length) return;

            for (const parentId of student.parentIds) {
                NotificationService.sendNotification(db, schoolId, parentId, {
                    title: "Nouvelle note disponible",
                    content: `Une nouvelle note (${data.grade}/20) a été enregistrée pour ${student.firstName} en ${data.subject}.`,
                    href: `/dashboard/parent/student/${studentId}?tab=notes`,
                }).catch(reportSyncError("notification d'une note aux parents"));
            }
        } catch (notifyError) {
            console.error('Error sending grade notification:', notifyError);
        }
    },

    /**
     * Update an existing grade
     */
    updateGrade: async (schoolId: string, studentId: string, gradeId: string, data: Partial<GradeData>): Promise<WriteOutcome> => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const gradeRef = doc(db, `ecoles/${schoolId}/eleves/${studentId}/notes/${gradeId}`);
            return await commitWrite(updateDoc(gradeRef, data), "modification d'une note");
        } catch (error) {
            console.error('Error updating grade:', error);
            throw error;
        }
    },

    /**
     * Delete a grade (permanent deletion)
     */
    deleteGrade: async (schoolId: string, studentId: string, gradeId: string): Promise<WriteOutcome> => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const gradeRef = doc(db, `ecoles/${schoolId}/eleves/${studentId}/notes/${gradeId}`);
            return await commitWrite(deleteDoc(gradeRef), "suppression d'une note");
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
