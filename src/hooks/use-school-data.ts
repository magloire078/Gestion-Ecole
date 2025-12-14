
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
            setSchoolData(null);
            setLoading(false);
            return;
        }

        const findSchoolForUser = async (userId: string) => {
            setLoading(true);
            
            // Étape 1: Vérifier le document utilisateur
            const userRootRef = doc(firestore, 'utilisateurs', userId);
            const userDoc = await getDoc(userRootRef);

            if (userDoc.exists() && userDoc.data().schoolId) {
                setSchoolId(userDoc.data().schoolId);
                setLoading(false);
                return;
            }

            // Étape 2: Si l'étape 1 échoue, chercher si l'utilisateur est directeur d'une école
            const schoolsRef = collection(firestore, 'ecoles');
            const q = query(schoolsRef, where("directorId", "==", userId));
            const schoolQuerySnapshot = await getDocs(q);

            if (!schoolQuerySnapshot.empty) {
                const foundSchoolDoc = schoolQuerySnapshot.docs[0];
                const foundSchoolId = foundSchoolDoc.id;
                
                // Étape 3: Correction automatique - mettre à jour le document utilisateur
                try {
                    await setDoc(userRootRef, { schoolId: foundSchoolId }, { merge: true });
                    setSchoolId(foundSchoolId);
                } catch(e) {
                     console.error("Failed to auto-correct user document:", e);
                }
                setLoading(false);
                return;
            }

            // Étape 4: Aucune école trouvée
            setSchoolId(null);
            setLoading(false);
        };

        findSchoolForUser(user.uid);

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

        setLoading(true);
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        const unsubscribe = onSnapshot(schoolDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as SchoolData;
                setSchoolData(data);
                document.title = data.name ? `${data.name} - Gestion Scolaire` : DEFAULT_TITLE;
            } else {
                setSchoolData(null);
                setSchoolId(null); // L'école référencée n'existe pas, réinitialiser
                document.title = DEFAULT_TITLE;
            }
            setLoading(false);
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
