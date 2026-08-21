import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    getDocs,
    orderBy,
    serverTimestamp,
    where,
} from 'firebase/firestore';
import { firebaseFirestore as db } from '@/firebase/config';
import type { staff as Staff } from '@/lib/data-types';

const COLLECTION_NAME = 'personnel';

export const StaffService = {
    createStaffMember: async (schoolId: string, data: Omit<Staff, 'id' | 'schoolId'>) => {
        if (!schoolId) {
            throw new Error("L'identifiant de l'école est requis pour créer un membre du personnel.");
        }
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
            console.error('Error creating staff member:', error);
            throw error;
        }
    },

    updateStaffMember: async (schoolId: string, staffId: string, data: Partial<Staff>) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, staffId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating staff member:', error);
            throw error;
        }
    },

    deleteStaffMember: async (schoolId: string, staffId: string, idToken: string) => {
        if (!schoolId || !staffId) {
            throw new Error("L'ID de l'école et du membre du personnel sont requis.");
        }
        // Retirer un membre touche aussi son document users/{staffId} — celui
        // d'un AUTRE utilisateur que l'appelant, ce que les règles Firestore
        // interdisent depuis le client. Passe donc par une route serveur
        // (SDK admin) qui revérifie la permission manageUsers elle-même.
        const response = await fetch('/api/staff/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ schoolId, staffId }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Impossible de supprimer le membre du personnel.');
        }
    },

    updateStaffPhoto: async (schoolId: string, staffId: string, photoUrl: string) => {
        try {
            const docRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}`, staffId);
            await updateDoc(docRef, { photoURL: photoUrl });
        } catch (error) {
            console.error('Error updating staff photo:', error);
            throw error;
        }
    },

    getStaffMembers: async (schoolId: string) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            const q = query(collectionRef, orderBy('lastName', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff & { id: string }));
        } catch (error) {
            console.error('Error fetching staff members:', error);
            throw error;
        }
    },

    getStaffByEmail: async (schoolId: string, email: string) => {
        try {
            const collectionRef = collection(db, `ecoles/${schoolId}/${COLLECTION_NAME}`);
            const q = query(collectionRef, where('email', '==', email));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Staff & { id: string };
        } catch (error) {
            console.error('Error fetching staff member by email:', error);
            throw error;
        }
    }
};

// Export individual methods for backward compatibility
export const {
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
    updateStaffPhoto,
    getStaffMembers,
    getStaffByEmail
} = StaffService;

