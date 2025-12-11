
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, getDoc } from 'firebase/firestore';
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
            setLoading(false);
            setSchoolId(null);
            setSchoolData(null);
            return;
        }

        // The schoolId is now reliably on the custom claims.
        const userSchoolId = user.customClaims?.schoolId || null;
        setSchoolId(userSchoolId);

    }, [user, userLoading]);

    useEffect(() => {
        if (schoolId === null) { // Explicitly check for null which means user has no school
            setSchoolData(null);
            setLoading(false);
            document.title = DEFAULT_TITLE;
            return;
        }

        if (!schoolId) { // Undefined, still waiting for user doc
            return;
        }
        
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
            setLoading(false); // Final loading state set here
        }, (error) => {
             const permissionError = new FirestorePermissionError({ path: schoolDocRef.path, operation: 'get' });
             errorEmitter.emit('permission-error', permissionError);
             setSchoolData(null);
             setLoading(false);
        });

        return () => unsubscribeSchool();
        
    }, [schoolId, firestore]);

    const updateSchoolData = useCallback(async (data: Partial<SchoolData>) => {
        if (!schoolId) {
            throw new Error("ID de l'école non disponible. Impossible de mettre à jour.");
        }
        
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        
        const schoolSnap = await getDoc(schoolDocRef);
        if (!schoolSnap.exists()) {
            throw new Error("Document de l'école non trouvé.");
        }

        const dataToUpdate = {
            ...data,
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
    }, [schoolId, firestore]);

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
