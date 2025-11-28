
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, getDoc, DocumentData, setDoc, writeBatch } from 'firebase/firestore';
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
    subscription?: Subscription;
}

export function useSchoolData() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [schoolId, setSchoolId] = useState<string | undefined>(undefined);

    const [schoolName, setSchoolName] = useState<string | null>(null);
    const [directorName, setDirectorName] = useState<string | null>(null);
    const [schoolCode, setSchoolCode] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) {
            setLoading(true);
            return;
        }

        if (!user) {
            setLoading(false);
            return;
        }

        const userRootRef = doc(firestore, 'utilisateurs', user.uid);
        const unsubscribe = onSnapshot(userRootRef, (userDocSnap) => {
            if (userDocSnap.exists()) {
                const userSchoolId = userDocSnap.data()?.schoolId;
                if (userSchoolId && userSchoolId !== schoolId) {
                    setSchoolId(userSchoolId);
                } else if (!userSchoolId) {
                     setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }, (error) => {
            console.error("Error fetching user root doc:", error);
            setLoading(false);
        });
        
        return () => unsubscribe();

    }, [user, userLoading, firestore, schoolId]);

    useEffect(() => {
        if (!schoolId) {
            return;
        }
        
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        const unsubscribeSchool = onSnapshot(schoolDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as SchoolData;
                const name = data.name || 'Mon École';
                setSchoolName(name);
                setDirectorName(data.directorName || user?.displayName || 'Directeur/rice');
                setSchoolCode(data.schoolCode || null);
                setSubscription(data.subscription || { plan: 'Essentiel', status: 'active' });
                document.title = name ? `${name} - Gestion Scolaire` : DEFAULT_TITLE;
            } else {
                setSchoolName('École non trouvée');
                setDirectorName('N/A');
                document.title = DEFAULT_TITLE;
            }
             if (loading && user) setLoading(false);
        }, (error) => {
             const permissionError = new FirestorePermissionError({ path: schoolDocRef.path, operation: 'get' });
             errorEmitter.emit('permission-error', permissionError);
             setLoading(false);
        });

        return () => {
          unsubscribeSchool();
        };
        
    }, [schoolId, firestore, user, loading]);

    const updateSchoolData = useCallback(async (data: Partial<SchoolData>) => {
        if (!schoolId || !user) {
            throw new Error("ID de l'école ou utilisateur non disponible. Impossible de mettre à jour.");
        }

        const batch = writeBatch(firestore);
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        batch.update(schoolDocRef, data);
        
        // Si le nom du directeur est mis à jour, le synchroniser dans le profil utilisateur de l'école aussi
        if (data.directorName) {
            const userInSchoolRef = doc(firestore, `ecoles/${schoolId}/utilisateurs/${user.uid}`);
            batch.update(userInSchoolRef, { displayName: data.directorName });
        }
        
        try {
            await batch.commit();
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({ 
                path: `BATCH WRITE on /ecoles/${schoolId} and /ecoles/${schoolId}/utilisateurs/${user.uid}`, 
                operation: 'update', 
                requestResourceData: data 
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        }
    }, [schoolId, user, firestore]);

    return { schoolId, schoolName, directorName, schoolCode, subscription, loading, updateSchoolData };
}
