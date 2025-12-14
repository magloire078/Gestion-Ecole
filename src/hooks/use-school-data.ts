
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, getDoc, serverTimestamp, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
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
            setLoading(false);
            return;
        }

        const findSchoolForUser = async (userId: string) => {
            setLoading(true);
            try {
                // Method 1: Check the user document for a schoolId
                const userDocRef = doc(firestore, 'utilisateurs', userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data()?.schoolId) {
                    const foundSchoolId = userDoc.data().schoolId;
                    const schoolDoc = await getDoc(doc(firestore, 'ecoles', foundSchoolId));
                    if (schoolDoc.exists()) {
                         setSchoolId(foundSchoolId);
                         return;
                    } else {
                        // Data is inconsistent, the referenced school doesn't exist.
                        // Let's proceed to the next check.
                    }
                }

                // Method 2: If user doc has no schoolId, check if the user is a director of any school
                const schoolsQuery = query(collection(firestore, 'ecoles'), where('directorId', '==', userId), limit(1));
                const schoolsSnapshot = await getDocs(schoolsQuery);

                if (!schoolsSnapshot.empty) {
                    const foundSchoolDoc = schoolsSnapshot.docs[0];
                    const foundSchoolId = foundSchoolDoc.id;
                    setSchoolId(foundSchoolId);
                    
                    // Auto-correction: update the user document with the found schoolId
                    await setDoc(userDocRef, { schoolId: foundSchoolId }, { merge: true });

                } else {
                    setSchoolId(null); // No school found for this user
                }
            } catch (error) {
                console.error("Error fetching user's school data:", error);
                setSchoolId(null);
            } finally {
                setLoading(false);
            }
        };

        findSchoolForUser(user.uid);
    }, [user, userLoading, firestore]);

    useEffect(() => {
        if (schoolId === null) {
            setSchoolData(null);
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
                setSchoolId(null); // The referenced school does not exist, reset.
                document.title = DEFAULT_TITLE;
            }
        }, (error) => {
             console.error("Error fetching school data:", error);
             setSchoolData(null);
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
