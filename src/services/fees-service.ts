'use client';

import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from "firebase/firestore";
import { firebaseFirestore as db } from '@/firebase/config';
import type { fee as Fee } from '@/lib/data-types';

const COLLECTION_NAME = 'frais_scolarite';

/**
 * Service for managing school fees in Firestore
 */
export const FeesService = {
    /**
     * Create a new fee
     */
    createFee: async (schoolId: string, data: Omit<Fee, 'id'>) => {
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
            console.error('Error creating fee:', error);
            throw error;
        }
    },

    /**
     * Update an existing fee
     */
    updateFee: async (schoolId: string, feeId: string, data: Partial<Fee>) => {
        try {
            const feeRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${feeId}`);
            await updateDoc(feeRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating fee:', error);
            throw error;
        }
    },

    /**
     * Delete a fee (permanent deletion)
     */
    deleteFee: async (schoolId: string, feeId: string) => {
        try {
            const feeRef = doc(db, `ecoles/${schoolId}/${COLLECTION_NAME}/${feeId}`);
            await deleteDoc(feeRef);
        } catch (error) {
            console.error('Error deleting fee:', error);
            throw error;
        }
    },
};
