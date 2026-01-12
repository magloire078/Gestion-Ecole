
'use client';

import { useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from '@/firebase/config';
import type { UserProfile, user_root } from '@/lib/data-types';

export interface AppUser {
    uid: string;
    isParent: boolean;
    authUser: FirebaseUser;
    profile?: UserProfile; 
    parentStudentIds?: string[];
    schoolId?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    email?: string | null;
}

// This hook is now self-contained and manages the full auth state.
export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        const userRootRef = doc(firestore, 'users', firebaseUser.uid);
        const userRootDoc = await getDoc(userRootRef);
        
        let schoolId: string | null = null;
        if (userRootDoc.exists()) {
          schoolId = (userRootDoc.data() as user_root).schoolId;
        }

        let userProfile: UserProfile | undefined = undefined;
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

      } else {
        // Check for parent session in localStorage
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
                // @ts-ignore - authUser is not available for parent sessions
                authUser: null, 
            });
        } else {
            setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isClient]);

  const isDirector = user?.profile?.role === 'directeur';

  return {
    user,
    loading,
    hasSchool: !!user?.schoolId,
    schoolId: user?.schoolId,
    isDirector,
    reloadUser: async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
    },
  };
}
