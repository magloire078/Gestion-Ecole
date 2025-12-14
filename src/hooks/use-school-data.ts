
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, getDoc, serverTimestamp, collection, query, where, getDocs, setDoc, limit } from 'firebase/firestore';
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

async function updateUserSchoolId(firestore: any, userId: string, schoolId: string) {
  const userRef = doc(firestore, 'utilisateurs', userId);
  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists() || userDoc.data()?.schoolId !== schoolId) {
      await setDoc(userRef, { schoolId }, { merge: true });
       console.log(`User document for ${userId} has been synced with schoolId: ${schoolId}`);
    }
  } catch (error) {
    console.error("Failed to sync user's schoolId:", error);
    // Emit a permission error if that's the cause
     const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'write',
        requestResourceData: { schoolId },
    });
    errorEmitter.emit('permission-error', permissionError);
  }
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
            // Method 1: Check user document directly.
            const userRef = doc(firestore, 'utilisateurs', userId);
            try {
                const userDoc = await getDoc(userRef);
                if (userDoc.exists() && userDoc.data()?.schoolId) {
                    return userDoc.data().schoolId;
                }
            } catch (e) {
                // This will catch permission errors on the user doc itself
                console.error("Error reading user document:", e);
                 const permissionError = new FirestorePermissionError({ path: userRef.path, operation: 'get' });
                 errorEmitter.emit('permission-error', permissionError);
            }

            // Method 2: If user doc has no schoolId, check if the user is a director of any school
            const schoolsQuery = query(collection(firestore, 'ecoles'), where('directorId', '==', userId), limit(1));
            const schoolsSnapshot = await getDocs(schoolsQuery);

            if (!schoolsSnapshot.empty) {
                const foundSchoolId = schoolsSnapshot.docs[0].id;
                // Auto-correct: sync the found schoolId back to the user document for future faster lookups.
                await updateUserSchoolId(firestore, userId, foundSchoolId);
                return foundSchoolId;
            }

            return null; // No school found by any method
        };

        findSchoolForUser(user.uid).then(id => {
            setSchoolId(id);
            if (!id) {
                setLoading(false);
            }
            // If an ID is found, loading will be set to false by the school data listener
        }).catch(error => {
            console.error("Error in findSchoolForUser:", error);
            setSchoolId(null);
            setLoading(false);
        });

    }, [user, userLoading, firestore]);

    useEffect(() => {
        if (!schoolId) {
            setSchoolData(null);
            if (!userLoading) setLoading(false);
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
                setSchoolId(null); // The referenced school does not exist
            }
            setLoading(false);
        }, (error) => {
             console.error("Error fetching school data:", error);
             setSchoolData(null);
             setLoading(false);
        });

        return () => unsubscribeSchool();
        
    }, [schoolId, firestore, userLoading]);

    const updateSchoolData = useCallback(async (data: Partial<SchoolData>) => {
        if (!schoolId) throw new Error("ID de l'école non disponible.");
        const schoolDocRef = doc(firestore, 'ecoles', schoolId);
        const dataToUpdate = {
            ...data,
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid,
            updatedByName: user?.displayName
        };
        await updateDoc(schoolDocRef, dataToUpdate);
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
