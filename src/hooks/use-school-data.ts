

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, getDoc, serverTimestamp, updateDoc as firestoreUpdateDoc, FirestoreError } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const DEFAULT_TITLE = 'GèreEcole - Solution de gestion scolaire tout-en-un';

export interface Subscription {
    plan: 'Essentiel' | 'Pro' | 'Premium';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    endDate?: string;
    maxStudents?: number;
    maxCycles?: number;
    activeModules?: ('sante' | 'cantine' | 'transport' | 'internat' | 'immobilier' | 'activites' | 'rh')[];
}

interface SchoolData extends DocumentData {
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
    subscription?: Subscription;
    updatedAt?: any; 
    updatedBy?: string;
    updatedByName?: string;
}

export function useSchoolData() {
    const { user: authUser, loading: userLoading, schoolId: authSchoolId } = useUser();
    const firestore = useFirestore();
    const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userLoading) {
            setLoading(true);
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
                const data = { id: docSnap.id, ...docSnap.data()} as SchoolData;
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

    return { 
        schoolId: authSchoolId, 
        schoolData,
        schoolName: schoolData?.name,
        directorName: `${schoolData?.directorFirstName || ''} ${schoolData?.directorLastName || ''}`.trim(),
        subscription: schoolData?.subscription,
        mainLogoUrl: schoolData?.mainLogoUrl,
        loading,
        error,
        updateSchoolData 
    };
}
