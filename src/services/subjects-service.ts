import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { firebaseFirestore as db } from '@/firebase/config';
import { subject as Subject } from '@/lib/data-types';

const COLLECTION_NAME = 'matieres';

export const SubjectsService = {
    createSubject: async (schoolId: string, data: Omit<Subject, 'id' | 'schoolId'>) => {
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
            console.error('Error creating subject:', error);
            throw error;
        }
    },

    updateSubject: async (schoolId: string, subjectId: string, data: Partial<Subject>) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, subjectId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating subject:', error);
            throw error;
        }
    },

    deleteSubject: async (schoolId: string, subjectId: string) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, subjectId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting subject:', error);
            throw error;
        }
    },

    getSubjects: async (schoolId: string) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            const q = query(collectionRef, orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject & { id: string }));
        } catch (error) {
            console.error('Error fetching subjects:', error);
            throw error;
        }
    }
};
