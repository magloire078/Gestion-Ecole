
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
}

export function useSchoolData() {
    const { user } = useUser();
    const firestore = useFirestore();
    const schoolId = user?.customClaims?.schoolId;

    const [schoolName, setSchoolName] = useState<string | null>(null);
    const [directorName, setDirectorName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (schoolId) {
            const schoolDocRef = doc(firestore, 'schools', schoolId);
            const unsubscribe = onSnapshot(schoolDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data() as SchoolData;
                    const name = data.name || 'GèreEcole';
                    const dirName = data.directorName || user?.displayName || 'Directeur/rice';
                    
                    setSchoolName(name);
                    setDirectorName(dirName);
                    
                    document.title = name ? `${name} - Gestion Scolaire` : DEFAULT_TITLE;
                } else {
                    // Fallback if school doc doesn't exist for some reason
                    setSchoolName('GèreEcole');
                    setDirectorName(user?.displayName || 'Directeur/rice');
                    document.title = DEFAULT_TITLE;
                }
                setLoading(false);
            }, (error) => {
                console.error("Erreur d'écoute du document de l'école:", error);
                 const permissionError = new FirestorePermissionError({ path: schoolDocRef.path, operation: 'get' });
                 errorEmitter.emit('permission-error', permissionError);
                setLoading(false);
            });

            return () => unsubscribe();
        } else if (user) {
            // User is authenticated but might not have a schoolId yet (e.g. during onboarding)
            setLoading(false);
            setSchoolName('GèreEcole');
            setDirectorName(user.displayName || 'Directeur/rice');
            document.title = DEFAULT_TITLE;
        } else if (!user && !loading) {
            // User is not logged in and we are not in a loading state
            setLoading(false);
        }

    }, [schoolId, firestore, user, loading]);

    const updateSchoolData = async (data: Partial<SchoolData>) => {
        if (!schoolId) {
            throw new Error("ID de l'école non disponible. Impossible de mettre à jour.");
        }
        const schoolDocRef = doc(firestore, 'schools', schoolId);
        try {
            await setDoc(schoolDocRef, data, { merge: true });
        } catch (error) {
            const permissionError = new FirestorePermissionError({ path: schoolDocRef.path, operation: 'update', requestResourceData: data });
            errorEmitter.emit('permission-error', permissionError);
            // Re-throw or handle as needed
            throw error;
        }
    };

    return { schoolId, schoolName, directorName, loading, updateSchoolData };
}
