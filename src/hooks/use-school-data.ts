
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, DocumentData } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const DEFAULT_TITLE = 'GèreEcole - Solution de gestion scolaire tout-en-un';

interface Subscription {
    plan: 'Essentiel' | 'Pro';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
}

interface SchoolData extends DocumentData {
    name?: string;
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
                setSchoolData(data);
                document.title = data.name ? `${data.name} - Gestion Scolaire` : DEFAULT_TITLE;
            } else {
                setSchoolData(null);
                document.title = DEFAULT_TITLE;
            }
            setLoading(false);
        }, (error) => {
             const permissionError = new FirestorePermissionError({ path: schoolDocRef.path, operation: 'get' });
             errorEmitter.emit('permission-error', permissionError);
             setLoading(false);
        });

        return () => unsubscribeSchool();
        
    }, [schoolId, firestore, userLoading]);

    const updateSchoolData = useCallback(async (data: Partial<SchoolData>) => {
        if (!schoolId) {
            throw new Error("ID de l'école non disponible. Impossible de mettre à jour.");
        }
        
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        
        try {
            await updateDoc(schoolDocRef, data);
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({ 
                path: schoolDocRef.path, 
                operation: 'update', 
                requestResourceData: data 
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        }
    }, [schoolId, firestore]);

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
