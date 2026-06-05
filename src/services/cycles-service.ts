
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    getCountFromServer,
    increment,
    query,
    setDoc,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
    Firestore
} from 'firebase/firestore';
import { firebaseFirestore as db } from '@/firebase/config';
import { cycle as Cycle } from '@/lib/data-types';
import { getPlanLimits } from '@/lib/subscription-plans';
import { buildLimitReachedMessage } from '@/lib/subscription-guards';

const COLLECTION_NAME = 'cycles';

async function checkCycleLimit(schoolId: string): Promise<void> {
    const schoolSnap = await getDoc(doc(db, `ecoles/${schoolId}`));
    if (!schoolSnap.exists()) return;

    const planName = schoolSnap.data()?.subscription?.plan || 'Essentiel';
    const limits = getPlanLimits(planName);
    if (!limits || !Number.isFinite(limits.maxCycles)) return;

    const countSnap = await getCountFromServer(
        collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`),
    );
    const currentCount = countSnap.data().count;

    if (currentCount >= limits.maxCycles) {
        throw new Error(buildLimitReachedMessage('cycles', planName, limits.maxCycles));
    }
}

export const CyclesService = {
    /**
     * Creates a new cycle for a school (avec contrôle du plafond du plan).
     */
    createCycle: async (schoolId: string, data: Omit<Cycle, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>) => {
        try {
            await checkCycleLimit(schoolId);

            const batch = writeBatch(db);
            const cycleRef = doc(collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`));
            batch.set(cycleRef, {
                ...data,
                schoolId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            const statsRef = doc(db, `ecoles/${schoolId}/stats/structure`);
            batch.set(statsRef, { cyclesCount: increment(1), lastUpdated: serverTimestamp() }, { merge: true });
            await batch.commit();
            return cycleRef.id;
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
     * Deletes a cycle (et décrémente le compteur).
     */
    deleteCycle: async (schoolId: string, cycleId: string) => {
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${cycleId}`));
            batch.set(
                doc(db, `ecoles/${schoolId}/stats/structure`),
                { cyclesCount: increment(-1), lastUpdated: serverTimestamp() },
                { merge: true },
            );
            await batch.commit();
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
