'use client';

import { addDoc, collection, query, where, collectionGroup, orderBy, getDocs, serverTimestamp } from "firebase/firestore";
import { firebaseFirestore as db } from '@/firebase/config';

interface IncidentData {
    type: 'Avertissement Oral' | 'Avertissement Écrit' | 'Retenue' | 'Mise à pied' | 'Exclusion temporaire' | 'Exclusion définitive';
    reason: string;
    actionsTaken?: string;
    parentNotified: boolean;
    studentName: string;
    classId?: string;
    schoolId: string;
    studentId: string;
    reportedById: string;
    reportedByName: string;
    date: string;
    followUpNotes?: string;
}

interface IncidentEntry extends IncidentData {
    id: string;
}

/**
 * Service for managing discipline incidents in Firestore
 * Note: Incidents are stored in a nested structure under each student:
 * /ecoles/{schoolId}/eleves/{studentId}/incidents_disciplinaires/{incidentId}
 */
export const DisciplineService = {
    /**
     * Create a new discipline incident for a student
     */
    createIncident: async (
        schoolId: string,
        studentId: string,
        data: Omit<IncidentData, 'schoolId' | 'studentId' | 'date' | 'reportedById' | 'reportedByName'>,
        reportedBy: { uid: string; displayName?: string }
    ) => {
        try {
            const incidentCollectionRef = collection(db, `ecoles/${schoolId}/eleves/${studentId}/incidents_disciplinaires`);
            const incidentData = {
                ...data,
                schoolId,
                studentId,
                date: new Date().toISOString(),
                reportedById: reportedBy.uid,
                reportedByName: reportedBy.displayName || 'Système',
                followUpNotes: data.followUpNotes || '',
            };
            const docRef = await addDoc(incidentCollectionRef, incidentData);
            return docRef.id;
        } catch (error) {
            console.error('Error creating incident:', error);
            throw error;
        }
    },

    /**
     * Create parent notifications for an incident
     */
    createParentNotifications: async (
        schoolId: string,
        parentIds: string[],
        studentInfo: { id: string; firstName: string },
        incidentType: string
    ) => {
        try {
            const promises = parentIds.map(parentId => {
                const notificationData = {
                    userId: parentId,
                    title: `Incident disciplinaire: ${studentInfo.firstName}`,
                    content: `Un incident de type "${incidentType}" a été enregistré pour votre enfant.`,
                    href: `/dashboard/parent/student/${studentInfo.id}?tab=discipline`,
                    isRead: false,
                    createdAt: serverTimestamp(),
                };
                return addDoc(collection(db, `ecoles/${schoolId}/notifications`), notificationData);
            });
            await Promise.all(promises);
        } catch (error) {
            console.error('Error creating notifications:', error);
            // Don't throw - notifications are not critical
        }
    },

    /**
     * Get all discipline incidents for a school
     * Uses collectionGroup to query across all students
     */
    getAllIncidents: async (schoolId: string): Promise<IncidentEntry[]> => {
        try {
            const incidentsQuery = query(
                collectionGroup(db, 'incidents_disciplinaires'),
                where('schoolId', '==', schoolId),
                orderBy('date', 'desc')
            );

            const querySnapshot = await getDocs(incidentsQuery);
            const incidents: IncidentEntry[] = [];

            querySnapshot.forEach(doc => {
                incidents.push({
                    id: doc.id,
                    ...doc.data()
                } as IncidentEntry);
            });

            return incidents;
        } catch (error) {
            console.error('Error fetching incidents:', error);
            throw error;
        }
    },
};

// Export types for use in components
export type { IncidentData, IncidentEntry };
