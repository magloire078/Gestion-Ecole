
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    Firestore
} from 'firebase/firestore';
import { firebaseFirestore as db } from '@/firebase/config';
import { cycle as Cycle } from '@/lib/data-types';

const COLLECTION_NAME = 'cycles';

export const CyclesService = {
    /**
     * Creates a new cycle for a school
     */
    createCycle: async (schoolId: string, data: Omit<Cycle, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) => {
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
            console.error('Error creating cycle:', error);
            throw error;
        }
    },

    /**
     * Updates an existing cycle
     */
    updateCycle: async (schoolId: string, cycleId: string, data: Partial<Omit<Cycle, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>>) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, cycleId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating cycle:', error);
            throw error;
        }
    },

    /**
     * Deletes a cycle
     */
    deleteCycle: async (schoolId: string, cycleId: string) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, cycleId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting cycle:', error);
            throw error;
        }
    },

    /**
     * Fetches all cycles for a school, ordered by 'order'
     */
    getCycles: async (schoolId: string) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            const q = query(collectionRef, orderBy('order', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle & { id: string }));
        } catch (error) {
            console.error('Error fetching cycles:', error);
            throw error;
        }
    }
};
