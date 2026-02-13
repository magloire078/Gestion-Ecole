
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    getDocs,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { firebaseFirestore as db } from '@/firebase/config';
import type { timetableEntry } from '@/lib/data-types';

const COLLECTION_NAME = 'emploi_du_temps';

export const TimetableService = {
    createEntry: async (schoolId: string, data: Omit<timetableEntry, 'id'>) => {
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
            console.error('Error creating timetable entry:', error);
            throw error;
        }
    },

    updateEntry: async (schoolId: string, entryId: string, data: Partial<timetableEntry>) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, entryId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating timetable entry:', error);
            throw error;
        }
    },

    deleteEntry: async (schoolId: string, entryId: string) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, entryId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting timetable entry:', error);
            throw error;
        }
    },

    getTimetable: async (schoolId: string, classId?: string) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            let q = query(collectionRef);

            if (classId && classId !== 'all') {
                q = query(collectionRef, where('classId', '==', classId));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as timetableEntry));
        } catch (error) {
            console.error('Error fetching timetable:', error);
            throw error;
        }
    }
};
