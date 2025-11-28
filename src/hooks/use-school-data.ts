
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, getDoc, DocumentData, setDoc } from 'firebase/firestore';
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

        // --- Nouvelle logique ---
        // 1. Récupérer le schoolId directement depuis la collection `utilisateurs`
        const userRootRef = doc(firestore, 'utilisateurs', user.uid);
        getDoc(userRootRef).then(userDocSnap => {
            if (userDocSnap.exists()) {
                const userSchoolId = userDocSnap.data()?.schoolId;
                if (userSchoolId) {
                    setSchoolId(userSchoolId);
                } else {
                    setLoading(false); // Pas de schoolId, probablement en cours d'onboarding
                }
            } else {
                setLoading(false); // Pas encore de document, en cours d'onboarding
            }
        }).catch(error => {
            console.error("Error fetching user root doc:", error);
            setLoading(false);
        });

    }, [user, userLoading, firestore]);

    useEffect(() => {
        if (!schoolId) {
            // Si pas de schoolId, on ne fait rien et on attend. 
            // `loading` reste à true jusqu'à ce que `schoolId` soit défini.
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
                setSubscription(data.subscription || { plan: 'Essentiel', status: 'active' });
                
                document.title = name ? `${name} - Gestion Scolaire` : DEFAULT_TITLE;
            } else {
                setSchoolName('École non trouvée');
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
        
    }, [schoolId, firestore, user]);

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

    return { schoolId, schoolName, directorName, schoolCode, subscription, loading, updateSchoolData };
}

    