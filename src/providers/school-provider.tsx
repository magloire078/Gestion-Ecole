'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, serverTimestamp, updateDoc as firestoreUpdateDoc, FirestoreError, DocumentData } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Subscription } from '@/hooks/use-school-data';

const DEFAULT_TITLE = 'GèreEcole - Solution de gestion scolaire tout-en-un';

export interface SchoolData extends DocumentData {
    id?: string;
    name?: string;
    directorId?: string;
    directorFirstName?: string;
    directorLastName?: string;
    directorPhone?: string;
    directorEmail?: string;
    schoolCode?: string;
    matricule?: string;
    mainLogoUrl?: string;
    digitalSignatureUrl?: string;
    currentAcademicYear?: string;
    subscription?: Subscription;
    updatedAt?: any;
    updatedBy?: string;
    updatedByName?: string;
}

interface SchoolContextType {
    schoolId: string | null | undefined;
    schoolData: SchoolData | null;
    schoolName?: string;
    directorName?: string;
    subscription?: Subscription;
    mainLogoUrl?: string;
    digitalSignatureUrl?: string;
    currentAcademicYear?: string;
    loading: boolean;
    loadingTimeout: boolean;
    error: string | null;
    updateSchoolData: (data: Partial<SchoolData>) => Promise<void>;
    reloadUser: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
    const { user: authUser, loading: userLoading, schoolId: authSchoolId, loadingTimeout, reloadUser } = useUser();
    const firestore = useFirestore();
    const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userLoading) {
            return;
        }

        if (!authSchoolId || !firestore) {
            setSchoolData(null);
            setLoading(false);
            document.title = DEFAULT_TITLE;
            return;
        }

        setLoading(true);
        const schoolDocRef = doc(firestore, 'ecoles', authSchoolId);
        const unsubscribe = onSnapshot(schoolDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as SchoolData;
                setSchoolData(data);
                document.title = data.name ? `${data.name} - Gestion Scolaire` : DEFAULT_TITLE;
            } else {
                setSchoolData(null);
                setError("Données de l'école non trouvées.");
            }
            setLoading(false);
        }, (err: FirestoreError) => {
            console.error("Error fetching school data:", err);
            setSchoolData(null);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authSchoolId, firestore, userLoading]);

    const updateSchoolData = useCallback(async (data: Partial<SchoolData>) => {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!authSchoolId) throw new Error("ID de l'école non disponible.");
        if (!currentUser) throw new Error("Utilisateur non authentifié.");

        const schoolDocRef = doc(firestore, 'ecoles', authSchoolId);
        const dataToUpdate = {
            ...data,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid,
            updatedByName: currentUser.displayName,
        };

        try {
            await firestoreUpdateDoc(schoolDocRef, dataToUpdate);
        } catch (error) {
            console.error("Error updating school data:", error);
            throw error;
        }
    }, [authSchoolId, firestore]);

    const value = {
        schoolId: authSchoolId,
        schoolData,
        schoolName: schoolData?.name,
        directorName: `${schoolData?.directorFirstName || ''} ${schoolData?.directorLastName || ''}`.trim(),
        subscription: schoolData?.subscription,
        mainLogoUrl: schoolData?.mainLogoUrl,
        digitalSignatureUrl: schoolData?.digitalSignatureUrl,
        currentAcademicYear: schoolData?.currentAcademicYear,
        loading: userLoading ? true : loading,
        loadingTimeout,
        error,
        updateSchoolData,
        reloadUser
    };

    return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchoolContext() {
    const context = useContext(SchoolContext);
    if (context === undefined) {
        throw new Error('useSchoolContext must be used within a SchoolProvider');
    }
    return context;
}
