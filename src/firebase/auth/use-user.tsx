
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { onIdTokenChanged, getAuth } from 'firebase/auth';
import { useFirestore, useAuth } from '../client-provider';
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
  const auth = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const reloadUser = useCallback(async () => {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      if (currentUser) {
        await currentUser.reload();
      }
  }, []);

  useEffect(() => {
    if (!isClient || !auth) {
        // Attendre que le client soit prêt et que l'auth soit initialisée
        return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);

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
            uid: firebaseUser.uid,
            authUser: firebaseUser, 
            isParent: false, 
            schoolId: schoolId,
            profile: userProfile, 
            displayName: userProfile?.displayName || firebaseUser.displayName,
            email: firebaseUser.email, 
            photoURL: userProfile?.photoURL || firebaseUser.photoURL,
          });

        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        } finally {
            setLoading(false);
        }
      } else {
         const parentSessionId = localStorage.getItem('parent_session_id');
         const parentSchoolId = localStorage.getItem('parent_school_id');
         const parentStudentIdsStr = localStorage.getItem('parent_student_ids');

         if (parentSessionId && parentSchoolId && parentStudentIdsStr) {
            setUser({
              uid: parentSessionId, 
              isParent: true, 
              schoolId: parentSchoolId,
              parentStudentIds: JSON.parse(parentStudentIdsStr),
              displayName: 'Parent / Tuteur', 
              authUser: null,
            });
         } else {
            setUser(null);
         }
         setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isClient, firestore, auth]);

  const isDirector = user?.profile?.role === 'directeur';

  return {
    user,
    loading: loading || !isClient,
    hasSchool: !!user?.schoolId,
    schoolId: user?.schoolId,
    isDirector,
    reloadUser,
  };
}
