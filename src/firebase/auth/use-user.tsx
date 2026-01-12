
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { onIdTokenChanged, getAuth } from 'firebase/auth';
import { useFirestore } from '../client-provider';
import { auth } from '../config';
import type { UserProfile, user_root } from '@/lib/data-types';

export interface AppUser {
    uid: string;
    isParent: boolean;
    authUser: FirebaseUser | null;
    profile?: UserProfile; 
    parentStudentIds?: string[];
    schoolId?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    email?: string | null;
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs once on component mount to confirm we are on the client.
    setIsClient(true);
  }, []);

  const reloadUser = useCallback(async () => {
      const currentUser = getAuth().currentUser;
      if (currentUser) {
        await currentUser.reload();
        // The onIdTokenChanged listener will handle the state update automatically.
      }
  }, []);

  useEffect(() => {
    // Only run this effect on the client.
    if (!isClient) return;

    const handleAuthChange = async (firebaseUser: FirebaseUser | null) => {
      setLoading(true); // Start loading whenever auth state might be changing.

      if (firebaseUser) {
        const userRootRef = doc(firestore, 'users', firebaseUser.uid);
        try {
          const userRootDoc = await getDoc(userRootRef);
          let schoolId: string | null = null;
          let userProfile: UserProfile | undefined = undefined;

          if (userRootDoc.exists()) {
            schoolId = (userRootDoc.data() as user_root).schoolId;
          }

          if (schoolId) {
            const staffProfileRef = doc(firestore, `ecoles/${schoolId}/personnel/${firebaseUser.uid}`);
            const profileSnap = await getDoc(staffProfileRef);
            if (profileSnap.exists()) {
              userProfile = profileSnap.data() as UserProfile;
            }
          }
          
          setUser({
            uid: firebaseUser.uid, authUser: firebaseUser, isParent: false, schoolId: schoolId,
            profile: userProfile, displayName: userProfile?.displayName || firebaseUser.displayName,
            email: firebaseUser.email, photoURL: userProfile?.photoURL || firebaseUser.photoURL,
          });

        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
         // Check for parent session in localStorage if no Firebase user is found.
         const parentSessionId = localStorage.getItem('parent_session_id');
         const parentSchoolId = localStorage.getItem('parent_school_id');
         const parentStudentIdsStr = localStorage.getItem('parent_student_ids');

         if (parentSessionId && parentSchoolId && parentStudentIdsStr) {
            setUser({
              uid: parentSessionId, isParent: true, schoolId: parentSchoolId,
              parentStudentIds: JSON.parse(parentStudentIdsStr),
              displayName: 'Parent / Tuteur', authUser: null,
            });
         } else {
            setUser(null);
         }
      }
      setLoading(false); // Finished loading after all checks are done.
    };
    
    const unsubscribe = onIdTokenChanged(auth, handleAuthChange);

    return () => unsubscribe();
  }, [isClient, firestore]);

  const isDirector = user?.profile?.role === 'directeur';

  return {
    user,
    loading,
    hasSchool: !!user?.schoolId,
    schoolId: user?.schoolId,
    isDirector,
    reloadUser,
  };
}
