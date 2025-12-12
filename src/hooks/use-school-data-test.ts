
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useSchoolDataTest() {
  const [schoolData, setSchoolData] = useState<any>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();

  console.log('useSchoolDataTest - user:', user?.uid, 'firestore:', !!firestore);

  useEffect(() => {
    const fetchSchoolData = async () => {
      if (!user || !firestore) {
        console.log('No user or firestore');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching user document for:', user.uid);
        const userDocRef = doc(firestore, 'utilisateurs', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log('User data:', userData);
          
          const userSchoolId = userData.schoolId;
          if (userSchoolId) {
            console.log('Found schoolId:', userSchoolId);
            setSchoolId(userSchoolId);
            
            // Récupérer les données de l'école
            const schoolDocRef = doc(firestore, 'ecoles', userSchoolId);
            const schoolDocSnap = await getDoc(schoolDocRef);
            
            if (schoolDocSnap.exists()) {
              setSchoolData({ id: userSchoolId, ...schoolDocSnap.data() });
            } else {
              console.log('School document does not exist');
            }
          } else {
            console.log('No schoolId in user document');
          }
        } else {
          console.log('User document does not exist');
        }
      } catch (err: any) {
        console.error('Error fetching school data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [user, firestore]);

  return { schoolData, schoolId, loading, error };
}
