
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, collection } from 'firebase/firestore';
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
    directorName?: string;
    directorPhone?: string;
    schoolCode?: string;
    matricule?: string;
    mainLogoUrl?: string;
    subscription?: Subscription;
}

export function useSchoolData() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [schoolId, setSchoolId] = useState<string | undefined>(undefined);
    const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) {
            setLoading(true);
            return;
        }

        if (!user) {
            setLoading(false);
            setSchoolData(null);
            setSchoolId(undefined);
            return;
        }

        const userRootRef = doc(firestore, 'utilisateurs', user.uid);
        const unsubscribeUser = onSnapshot(userRootRef, (userDocSnap) => {
            if (userDocSnap.exists()) {
                const userSchoolId = userDocSnap.data()?.schoolId;
                setSchoolId(userSchoolId);
                if (!userSchoolId) {
                     setLoading(false);
                }
            } else {
                setLoading(false);
                setSchoolId(undefined);
            }
        }, (error) => {
            console.error("Error fetching user root doc:", error);
            setLoading(false);
        });
        
        return () => unsubscribeUser();

    }, [user, userLoading, firestore]);

    useEffect(() => {
        if (!schoolId) {
            if (!userLoading) setLoading(false);
             setSchoolData(null);
             document.title = DEFAULT_TITLE;
            return;
        }
        
        setLoading(true);
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        const unsubscribeSchool = onSnapshot(schoolDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as SchoolData;
                
                // Fetch all users in the school to get the role
                const usersCollectionRef = collection(firestore, `ecoles/${schoolId}/utilisateurs`);
                onSnapshot(usersCollectionRef, (usersSnapshot) => {
                    const usersData: any = {};
                    usersSnapshot.forEach(userDoc => {
                        usersData[userDoc.id] = userDoc.data();
                    });
                    setSchoolData({ ...data, utilisateurs: usersData });
                    document.title = data.name ? `${data.name} - Gestion Scolaire` : DEFAULT_TITLE;
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching school users:", error);
                     setSchoolData(data); // Set school data even if users fail to load
                     setLoading(false);
                });

            } else {
                setSchoolData(null);
                document.title = DEFAULT_TITLE;
                setLoading(false);
            }
        }, (error) => {
             const permissionError = new FirestorePermissionError({ path: schoolDocRef.path, operation: 'get' });
             errorEmitter.emit('permission-error', permissionError);
             setLoading(false);
        });

        return () => unsubscribeSchool();
        
    }, [schoolId, firestore, userLoading]);

    const updateSchoolData = useCallback(async (data: Partial<SchoolData>) => {
        if (!schoolId || !schoolData) {
            throw new Error("ID de l'école ou données non disponibles. Impossible de mettre à jour.");
        }
        
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        
        const dataToUpdate = {
            ...data,
            directorId: schoolData.directorId, // Ensure directorId is always present in the update
        };

        try {
            await updateDoc(schoolDocRef, dataToUpdate);
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({ 
                path: schoolDocRef.path, 
                operation: 'update', 
                requestResourceData: dataToUpdate 
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        }
    }, [schoolId, firestore, schoolData]);

    return { 
        schoolId, 
        schoolData,
        schoolName: schoolData?.name,
        directorName: schoolData?.directorName,
        subscription: schoolData?.subscription,
        mainLogoUrl: schoolData?.mainLogoUrl,
        loading, 
        updateSchoolData 
    };
}
