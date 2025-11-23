
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, setDoc, DocumentData } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const DEFAULT_TITLE = 'GèreEcole - Solution de gestion scolaire tout-en-un';

interface SchoolData extends DocumentData {
    name?: string;
    directorName?: string;
    schoolCode?: string;
}

export function useSchoolData() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [schoolId, setSchoolId] = useState<string | undefined>(undefined);

    const [schoolName, setSchoolName] = useState<string | null>(null);
    const [directorName, setDirectorName] = useState<string | null>(null);
    const [schoolCode, setSchoolCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We need to reactively get schoolId from the user object
        setSchoolId(user?.customClaims?.schoolId);
    }, [user]);


    useEffect(() => {
        // Initial loading state is true, and it should only change when we have a definitive answer.
        setLoading(true);

        if (userLoading) {
            // Don't do anything until the user object is resolved
            return;
        }

        if (!schoolId) {
             // If there's no schoolId even after user is loaded, it means they need onboarding
             // or there's an issue. We can stop loading and show default/empty state.
            setLoading(false);
            setSchoolName('GèreEcole');
            setDirectorName(user?.displayName || null);
            document.title = DEFAULT_TITLE;
            return;
        }
        
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        const unsubscribe = onSnapshot(schoolDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as SchoolData;
                const name = data.name || 'Mon École';
                const dirName = data.directorName || user?.displayName || 'Directeur/rice';
                
                setSchoolName(name);
                setDirectorName(dirName);
                setSchoolCode(data.schoolCode || null);
                
                document.title = name ? `${name} - Gestion Scolaire` : DEFAULT_TITLE;
            } else {
                // The schoolId exists but the document doesn't, which is an error state.
                setSchoolName('École non trouvée');
                setDirectorName(user?.displayName || 'Directeur/rice');
                setSchoolCode(null);
                document.title = DEFAULT_TITLE;
            }
            setLoading(false);
        }, (error) => {
             const permissionError = new FirestorePermissionError({ path: schoolDocRef.path, operation: 'get' });
             errorEmitter.emit('permission-error', permissionError);
            setLoading(false);
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();
        
    }, [schoolId, firestore, user, userLoading]);

    const updateSchoolData = (data: Partial<SchoolData>) => {
        if (!schoolId) {
            throw new Error("ID de l'école non disponible. Impossible de mettre à jour.");
        }
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        
        return setDoc(schoolDocRef, data, { merge: true })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: schoolDocRef.path, operation: 'update', requestResourceData: data });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
    };

    return { schoolId, schoolName, directorName, schoolCode, loading, updateSchoolData };
}
