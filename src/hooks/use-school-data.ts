'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, DocumentData, getDoc, serverTimestamp, collection, query, where, getDocs, setDoc, limit } from 'firebase/firestore';

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

// Helper function to sync the user document
async function updateUserSchoolId(firestore: any, userId: string, schoolId: string) {
  const userRef = doc(firestore, 'utilisateurs', userId);
  try {
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists() || userDoc.data()?.schoolId !== schoolId) {
      await setDoc(userRef, { schoolId }, { merge: true });
    }
  } catch (error) {
    console.error("Failed to sync user's schoolId:", error);
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

        const userDocRef = doc(firestore, 'utilisateurs', user.uid);

        const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists() && userDoc.data()?.schoolId) {
                const foundSchoolId = userDoc.data().schoolId;
                if (schoolId !== foundSchoolId) {
                    setSchoolId(foundSchoolId);
                }
                 // setLoading will be handled by the school data listener
            } else {
                // If user document has no schoolId, check if they are a director somewhere
                const schoolsQuery = query(collection(firestore, 'ecoles'), where('directorId', '==', user.uid), limit(1));
                getDocs(schoolsQuery).then(schoolsSnapshot => {
                    if (!schoolsSnapshot.empty) {
                        const foundSchoolId = schoolsSnapshot.docs[0].id;
                        setSchoolId(foundSchoolId);
                        // Auto-correct: sync the found schoolId back to the user document
                        updateUserSchoolId(firestore, user.uid, foundSchoolId);
                    } else {
                        // Truly no school associated
                        setSchoolId(null);
                        setLoading(false);
                    }
                }).catch(error => {
                    console.error("Error searching for director's school:", error);
                    setSchoolId(null);
                    setLoading(false);
                });
            }
        }, (error) => {
            console.error("Error listening to user document:", error);
            setSchoolId(null);
            setLoading(false);
        });

        return () => unsubscribeUser();

    }, [user, userLoading, firestore, schoolId]);

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
        await updateDoc(schoolDocRef, data);
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
