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
    writeBatch,
    getDoc,
    deleteField
} from 'firebase/firestore';
import { firebaseFirestore as db } from '@/firebase/config';
import type { staff as Staff, user_root } from '@/lib/data-types';

const COLLECTION_NAME = 'personnel';

export const StaffService = {
    createStaffMember: async (schoolId: string, data: Omit<Staff, 'id' | 'schoolId'>) => {
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

    deleteStaffMember: async (schoolId: string, staffId: string) => {
        try {
            if (!schoolId || !staffId) {
                throw new Error("L'ID de l'école et du membre du personnel sont requis.");
            }

            const staffRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${staffId}`);
            const userRootRef = doc(db, `users/${staffId}`);

            const batch = writeBatch(db);

            // 1. Delete staff profile from school subcollection
            batch.delete(staffRef);

            // 2. Update user's root document to remove school affiliation
            // Note: This assumes the user document exists. 
            // If the staff member was just a profile without a user account, this might throw if not handled, 
            // but writeBatch operations are generally safe. However, reading first is safer for logic.
            const userRootSnap = await getDoc(userRootRef);
            if (userRootSnap.exists()) {
                const userData = userRootSnap.data() as user_root;

                const updateData: { [key: string]: any } = {
                    [`schools.${schoolId}`]: deleteField()
                };

                // If the active school is the one being removed, find a new one to set as active.
                if (userData.activeSchoolId === schoolId) {
                    const remainingSchoolIds = Object.keys(userData.schools || {}).filter(id => id !== schoolId);
                    updateData.activeSchoolId = remainingSchoolIds.length > 0 ? remainingSchoolIds[0] : null;
                }
                batch.update(userRootRef, updateData);
            }

            await batch.commit();

        } catch (error) {
            console.error('Error deleting staff member:', error);
            throw error;
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
    }
};

// Export individual methods for backward compatibility
export const {
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
    updateStaffPhoto,
    getStaffMembers
} = StaffService;

