
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
import { class_type as ClassType } from '@/lib/data-types';

const COLLECTION_NAME = 'classes';

export const ClassesService = {
    /**
     * Creates a new class for a school
     */
    createClasse: async (schoolId: string, data: Omit<ClassType, 'id' | 'schoolId' | 'createdAt' | 'updatedAt' | 'studentCount' | 'isFull'>) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);

            // Check for duplicate: same niveauId and section
            const duplicateQuery = query(
                collectionRef,
                where('niveauId', '==', data.niveauId),
                where('section', '==', data.section)
            );
            const duplicates = await getDocs(duplicateQuery);

            if (!duplicates.empty) {
                throw new Error(`Une classe avec ce nom existe déjà`);
            }

            const docRef = await addDoc(collectionRef, {
                ...data,
                schoolId,
                studentCount: 0,
                isFull: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating class:', error);
            throw error;
        }
    },


    /**
     * Updates an existing class
     */
    updateClasse: async (schoolId: string, classId: string, data: Partial<Omit<ClassType, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>>) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, classId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating class:', error);
            throw error;
        }
    },

    /**
     * Deletes a class
     */
    deleteClasse: async (schoolId: string, classId: string) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, classId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting class:', error);
            throw error;
        }
    },

    /**
     * Fetches all classes for a school
     */
    getClasses: async (schoolId: string, academicYear?: string) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            let q = query(collectionRef, orderBy('name', 'asc'));

            if (academicYear) {
                q = query(collectionRef, where('academicYear', '==', academicYear), orderBy('name', 'asc'));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassType & { id: string }));
        } catch (error) {
            console.error('Error fetching classes:', error);
            throw error;
        }
    },

    /**
     * Fetches classes for a specific niveau
     */
    getClassesByNiveau: async (schoolId: string, niveauId: string, academicYear?: string) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            let q = query(collectionRef, where('niveauId', '==', niveauId), orderBy('name', 'asc'));

            if (academicYear) {
                q = query(collectionRef, where('niveauId', '==', niveauId), where('academicYear', '==', academicYear), orderBy('name', 'asc'));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassType & { id: string }));
        } catch (error) {
            console.error('Error fetching classes by niveau:', error);
            throw error;
        }
    }
};
