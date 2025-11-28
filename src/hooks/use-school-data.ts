
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, writeBatch, DocumentData } from 'firebase/firestore';
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
    schoolCode?: string;
    matricule?: string;
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
            return;
        }

        const userRootRef = doc(firestore, 'utilisateurs', user.uid);
        const unsubscribeUser = onSnapshot(userRootRef, (userDocSnap) => {
            if (userDocSnap.exists()) {
                const userSchoolId = userDocSnap.data()?.schoolId;
                if (userSchoolId) {
                    setSchoolId(userSchoolId);
                } else {
                    setLoading(false);
                }
            } else {
                setLoading(false);
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
        if (!schoolId || !user) {
            throw new Error("ID de l'école ou utilisateur non disponible. Impossible de mettre à jour.");
        }
        
        // Optimistically update local state
        setSchoolData(prevData => prevData ? { ...prevData, ...data } : data);

        const batch = writeBatch(firestore);
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        batch.update(schoolDocRef, data);
        
        if (data.directorName) {
            const userInSchoolRef = doc(firestore, `ecoles/${schoolId}/utilisateurs/${user.uid}`);
            batch.update(userInSchoolRef, { displayName: data.directorName });
        }
        
        try {
            await batch.commit();
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({ 
                path: `BATCH WRITE on /ecoles/${schoolId}`, 
                operation: 'update', 
                requestResourceData: data 
            });
            errorEmitter.emit('permission-error', permissionError);
            // Revert optimistic update on error
            // Note: This is a simple revert. For a more robust solution, you'd refetch.
             setSchoolData(prevData => prevData ? { ...prevData } : null);
            throw permissionError;
        }
    }, [schoolId, user, firestore]);

    return { 
        schoolId, 
        schoolName: schoolData?.name || null,
        directorName: schoolData?.directorName || null,
        schoolCode: schoolData?.schoolCode || null,
        schoolMatricule: schoolData?.matricule || null,
        subscription: schoolData?.subscription || null,
        loading, 
        updateSchoolData 
    };
}
