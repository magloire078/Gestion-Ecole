'use client';

import { doc, setDoc, deleteDoc, collection, query, where, collectionGroup, getDocs, serverTimestamp } from "firebase/firestore";
import { firebaseFirestore as db } from '@/firebase/config';
import { commitWrite, type WriteOutcome } from '@/lib/offline-writes';

interface AbsenceData {
    date: string;
    type: 'Journée entière' | 'Matin' | 'Après-midi';
    justified: boolean;
    reason?: string;
    schoolId: string;
    studentId: string;
    studentName: string;
    classId?: string;
    recordedBy: string;
}

interface AbsenceEntry extends AbsenceData {
    id: string;
}

/**
 * Service for managing student absences in Firestore
 * Note: Absences are stored in a nested structure under each student:
 * /ecoles/{schoolId}/eleves/{studentId}/absences/{absenceId}
 */
export const AbsencesService = {
    /**
     * Create a new absence record for a student
     */
    createAbsence: async (schoolId: string, studentId: string, data: Omit<AbsenceData, 'schoolId' | 'studentId' | 'recordedBy'>, recordedBy: string) => {
        try {
            const absenceCollectionRef = collection(db, `ecoles/${schoolId}/eleves/${studentId}/absences`);
            // `doc()` sans identifiant en génère un côté client : on dispose donc de l'id
            // immédiatement, sans attendre le serveur. C'est aussi ce qui rend la saisie
            // hors ligne idempotente — une même validation produit toujours le même
            // document, là où `addDoc` répété créerait des doublons.
            const absenceRef = doc(absenceCollectionRef);
            const absenceData = {
                ...data,
                schoolId,
                studentId,
                recordedBy,
                createdAt: serverTimestamp(),
            };
            const outcome = await commitWrite(
                setDoc(absenceRef, absenceData),
                "création d'une absence",
            );
            return { id: absenceRef.id, outcome };
        } catch (error) {
            console.error('Error creating absence:', error);
            throw error;
        }
    },

    /**
     * Delete an absence record (permanent deletion)
     */
    deleteAbsence: async (schoolId: string, studentId: string, absenceId: string): Promise<WriteOutcome> => {
        try {
            const absenceRef = doc(db, `ecoles/${schoolId}/eleves/${studentId}/absences/${absenceId}`);
            return await commitWrite(deleteDoc(absenceRef), "suppression d'une absence");
        } catch (error) {
            console.error('Error deleting absence:', error);
            throw error;
        }
    },

    /**
     * Get all absences for a school from a specific date
     * Uses collectionGroup to query across all students
     */
    getAllAbsences: async (schoolId: string, fromDate: string): Promise<AbsenceEntry[]> => {
        try {
            const absencesQuery = query(
                collectionGroup(db, 'absences'),
                where('schoolId', '==', schoolId),
                where('date', '>=', fromDate)
            );

            const querySnapshot = await getDocs(absencesQuery);
            const absences: AbsenceEntry[] = [];

            querySnapshot.forEach(doc => {
                absences.push({
                    id: doc.id,
                    ...doc.data()
                } as AbsenceEntry);
            });

            // Sort by date (most recent first)
            absences.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return absences;
        } catch (error) {
            console.error('Error fetching absences:', error);
            throw error;
        }
    },
};

// Export types for use in components
export type { AbsenceData, AbsenceEntry };
