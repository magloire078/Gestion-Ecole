
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
    serverTimestamp
} from 'firebase/firestore';
import { firebaseFirestore as db } from '@/firebase/config';
import { niveau as Niveau } from '@/lib/data-types';

const COLLECTION_NAME = 'niveaux';

export const NiveauxService = {
    /**
     * Creates a new niveau for a school
     */
    createNiveau: async (schoolId: string, data: Omit<Niveau, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) => {
        try {
            // Check for name uniqueness within the cycle (optional but good practice) or globally for the school?
            // For now, let's just create.
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            const docRef = await addDoc(collectionRef, {
                ...data,
                schoolId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating niveau:', error);
            throw error;
        }
    },

    /**
     * Updates an existing niveau
     */
    updateNiveau: async (schoolId: string, niveauId: string, data: Partial<Omit<Niveau, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>>) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, niveauId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating niveau:', error);
            throw error;
        }
    },

    /**
     * Deletes a niveau
     */
    deleteNiveau: async (schoolId: string, niveauId: string) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, niveauId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting niveau:', error);
            throw error;
        }
    },

    /**
     * Fetches all niveaux for a school, ordered by 'order'
     */
    getNiveaux: async (schoolId: string) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            const q = query(collectionRef, orderBy('order', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Niveau & { id: string }));
        } catch (error) {
            console.error('Error fetching niveaux:', error);
            throw error;
        }
    },

    /**
     * Fetches niveaux for a specific cycle
     */
    getNiveauxByCycle: async (schoolId: string, cycleId: string) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            const q = query(collectionRef, where('cycleId', '==', cycleId), orderBy('order', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Niveau & { id: string }));
        } catch (error) {
            console.error('Error fetching niveaux by cycle:', error);
            throw error;
        }
    }
};
