'use client';

import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, increment, getDoc } from "firebase/firestore";
import { firebaseFirestore as db } from '@/firebase/config';
import type { libraryBook as LibraryBook, libraryLoan as LibraryLoan } from '@/lib/data-types';

const BOOKS_COLLECTION = 'bibliotheque';
const LOANS_COLLECTION = 'bibliotheque_prets';

/**
 * Service for managing library books and loans in Firestore
 */
export const LibraryService = {
    // ============ BOOK METHODS ============

    /**
     * Create a new book in the library
     */
    createBook: async (schoolId: string, data: Omit<LibraryBook, 'id' | 'schoolId' | 'createdAt'>) => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const collectionRef = collection(db, `ecoles/${schoolId}/${BOOKS_COLLECTION}`);
            const docRef = await addDoc(collectionRef, {
                ...data,
                schoolId,
                createdAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating book:', error);
            throw error;
        }
    },

    /**
     * Update an existing book
     */
    updateBook: async (schoolId: string, bookId: string, data: Partial<LibraryBook>) => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const bookRef = doc(db, `ecoles/${schoolId}/${BOOKS_COLLECTION}/${bookId}`);
            await updateDoc(bookRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating book:', error);
            throw error;
        }
    },

    /**
     * Delete a book (permanent deletion)
     */
    deleteBook: async (schoolId: string, bookId: string) => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const bookRef = doc(db, `ecoles/${schoolId}/${BOOKS_COLLECTION}/${bookId}`);
            await deleteDoc(bookRef);
        } catch (error) {
            console.error('Error deleting book:', error);
            throw error;
        }
    },

    // ============ LOAN METHODS ============

    /**
     * Create a new loan (when a student borrows a book)
     */
    createLoan: async (schoolId: string, data: Omit<LibraryLoan, 'id'>) => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const collectionRef = collection(db, `ecoles/${schoolId}/${LOANS_COLLECTION}`);
            const docRef = await addDoc(collectionRef, {
                ...data,
                createdAt: serverTimestamp(),
            });

            // Decrement book quantity
            const bookRef = doc(db, `ecoles/${schoolId}/${BOOKS_COLLECTION}/${data.bookId}`);
            await updateDoc(bookRef, {
                quantity: increment(-1),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        } catch (error) {
            console.error('Error creating loan:', error);
            throw error;
        }
    },

    /**
     * Mark a loan as returned
     */
    returnLoan: async (schoolId: string, loanId: string) => {
        try {
            if (!db) throw new Error("Firestore not initialized");
            const loanRef = doc(db, `ecoles/${schoolId}/${LOANS_COLLECTION}/${loanId}`);
            const loanSnap = await getDoc(loanRef);

            if (!loanSnap.exists()) {
                throw new Error("Loan not found");
            }

            const loanData = loanSnap.data() as LibraryLoan;

            // Mark as returned
            await updateDoc(loanRef, {
                status: 'returned',
                returnedDate: new Date().toISOString(),
                updatedAt: serverTimestamp(),
            });

            // Increment book quantity
            const bookRef = doc(db, `ecoles/${schoolId}/${BOOKS_COLLECTION}/${loanData.bookId}`);
            await updateDoc(bookRef, {
                quantity: increment(1),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error returning loan:', error);
            throw error;
        }
    },
};
