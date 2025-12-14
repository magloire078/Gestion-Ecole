
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, getDoc, serverTimestamp } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const DEFAULT_TITLE = 'GèreEcole - Solution de gestion scolaire tout-en-un';

interface Subscription {
    plan: 'Essentiel' | 'Pro';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
}

interface SchoolData extends DocumentData {
    name?: string;
    directorId?: string;
    directorFirstName?: string;
    directorLastName?: string;
    directorPhone?: string;
    schoolCode?: string;
    matricule?: string;
    mainLogoUrl?: string;
    subscription?: Subscription;
    // Ajout des champs pour le suivi des mises à jour
    updatedAt?: any; 
    updatedBy?: string;
    updatedByName?: string;
}

export function useSchoolData() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) {
            setLoading(true);
            return;
        }

        if (!user) {
            setSchoolId(null);
            setSchoolData(null);
            setLoading(false);
            return;
        }

        const findSchoolId = async () => {
            setLoading(true); // Start loading when we begin search
            try {
                const userRootRef = doc(firestore, 'utilisateurs', user.uid);
                const docSnap = await getDoc(userRootRef);
                if (docSnap.exists() && docSnap.data().schoolId) {
                    setSchoolId(docSnap.data().schoolId);
                } else {
                    setSchoolId(null);
                    setLoading(false); // Stop loading if no school is found
                }
            } catch (error) {
                console.error("Error fetching user root doc:", error);
                setSchoolId(null);
                setLoading(false);
            }
        };

        findSchoolId();

    }, [user, userLoading, firestore]);

    useEffect(() => {
        if (schoolId === null) {
            setSchoolData(null);
            setLoading(false);
            document.title = DEFAULT_TITLE;
            return;
        }
        
        if (!schoolId) {
            return;
        }

        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        const unsubscribe = onSnapshot(schoolDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as SchoolData;
                setSchoolData(data);
                document.title = data.name ? `${data.name} - Gestion Scolaire` : DEFAULT_TITLE;
            } else {
                setSchoolData(null);
                document.title = DEFAULT_TITLE;
            }
            setLoading(false); // Stop loading once school data is fetched or confirmed non-existent
        }, (error) => {
             console.error("Error fetching school data:", error);
             setSchoolData(null);
             setLoading(false);
        });

        return () => unsubscribe();
        
    }, [schoolId, firestore]);

    const updateSchoolData = useCallback(async (data: Partial<SchoolData>) => {
        if (!schoolId) {
            throw new Error("ID de l'école non disponible. Impossible de mettre à jour.");
        }
        
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        
        const previousData = { ...schoolData };
        const optimisticData = { ...schoolData, ...data };
        setSchoolData(optimisticData as SchoolData);

        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== undefined)
        );

        const dataToUpdate = {
            ...cleanData,
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid,
            updatedByName: user?.displayName || user?.email,
        };

        try {
            await updateDoc(schoolDocRef, dataToUpdate);
        } catch (serverError: any) {
            setSchoolData(previousData);
            
            const permissionError = new FirestorePermissionError({ 
                path: schoolDocRef.path, 
                operation: 'update', 
                requestResourceData: dataToUpdate 
            });
            errorEmitter.emit('permission-error', permissionError);
            
            throw new Error(serverError.code || 'unknown-error');
        }
    }, [schoolId, firestore, user, schoolData]);

    return { 
        schoolId, 
        schoolData,
        schoolName: schoolData?.name,
        directorName: `${schoolData?.directorFirstName || ''} ${schoolData?.directorLastName || ''}`.trim(),
        subscription: schoolData?.subscription,
        mainLogoUrl: schoolData?.mainLogoUrl,
        loading, 
        updateSchoolData 
    };
}
