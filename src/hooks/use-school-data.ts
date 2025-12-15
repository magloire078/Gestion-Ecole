
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, getDoc, serverTimestamp, collection, query, where, getDocs, setDoc, limit } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const DEFAULT_TITLE = 'GèreEcole - Solution de gestion scolaire tout-en-un';

interface Subscription {
    plan: 'Essentiel' | 'Pro' | 'Premium';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    maxStudents?: number;
    maxCycles?: number;
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

        if (!user || !firestore) {
            setSchoolId(null);
            setSchoolData(null);
            setLoading(false);
            return;
        }

        const findAndSetSchoolData = async (userId: string) => {
            setLoading(true);
            let foundSchoolId: string | null = null;

            // 1. Try claims first (fastest)
            const tokenResult = await user.getIdTokenResult();
            if (tokenResult.claims.schoolId) {
                foundSchoolId = tokenResult.claims.schoolId as string;
            }

            // 2. If no claim, check /utilisateurs/{uid} document
            if (!foundSchoolId) {
                try {
                    const userRef = doc(firestore, 'utilisateurs', userId);
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists() && userDoc.data()?.schoolId) {
                        foundSchoolId = userDoc.data().schoolId;
                    }
                } catch (e) {
                     console.error("Error reading user root document:", e);
                }
            }
            
            setSchoolId(foundSchoolId);

            if (!foundSchoolId) {
                setSchoolData(null);
                setLoading(false);
                document.title = DEFAULT_TITLE;
            }
        };

        findAndSetSchoolData(user.uid);

    }, [user, userLoading, firestore]);
    
    useEffect(() => {
        if (!schoolId) {
            // If schoolId becomes null after a check, ensure loading is false.
             if(!userLoading) setLoading(false);
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
                setSchoolId(null);
            }
            setLoading(false);
        }, (error) => {
             console.error("Error fetching school data:", error);
             const permissionError = new FirestorePermissionError({ path: schoolDocRef.path, operation: 'get' });
             errorEmitter.emit('permission-error', permissionError);
             setSchoolData(null);
             setLoading(false);
        });

        return () => unsubscribe();
    }, [schoolId, firestore, userLoading]);

    const updateSchoolData = useCallback(async (data: Partial<SchoolData>) => {
        if (!schoolId) throw new Error("ID de l'école non disponible.");
        if (!user) throw new Error("Utilisateur non authentifié.");
        
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        const dataToUpdate = {
            ...data,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
            updatedByName: user.displayName,
        };

        try {
            await updateDoc(schoolDocRef, dataToUpdate);
        } catch (error) {
            const permissionError = new FirestorePermissionError({
                path: schoolDocRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw error;
        }
    }, [schoolId, firestore, user]);

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
