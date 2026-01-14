

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onIdTokenChanged, getAuth } from 'firebase/auth';
import { useFirestore, useAuth } from '../client-provider';
import type { UserProfile, user_root } from '@/lib/data-types';

export interface AppUser {
    uid: string;
    isParent: boolean;
    authUser: FirebaseUser | null;
    profile?: UserProfile; 
    parentStudentIds?: string[];
    schoolId?: string | null; // L'école actuellement active
    schools?: { schoolId: string, role: string }[]; // Toutes les écoles de l'utilisateur
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
        return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        const userRootRef = doc(firestore, 'users', firebaseUser.uid);
        try {
          const userRootDoc = await getDoc(userRootRef);
          
          if (userRootDoc.exists()) {
            const userData = userRootDoc.data() as user_root;
            const schoolAffiliations = userData.schools || [];
            const activeSchoolId = userData.activeSchoolId || schoolAffiliations[0]?.schoolId || null;
            let userProfile: UserProfile | undefined = undefined;

            if (activeSchoolId) {
                const staffProfileRef = doc(firestore, `ecoles/${activeSchoolId}/personnel/${firebaseUser.uid}`);
                const profileSnap = await getDoc(staffProfileRef);
                if (profileSnap.exists()) {
                    userProfile = profileSnap.data() as UserProfile;
                }
            }
            
            setUser({
              uid: firebaseUser.uid,
              authUser: firebaseUser, 
              isParent: false, 
              schoolId: activeSchoolId, // École active
              schools: schoolAffiliations, // Liste de toutes les écoles
              profile: userProfile, 
              displayName: userProfile?.displayName || firebaseUser.displayName,
              email: firebaseUser.email, 
              photoURL: userProfile?.photoURL || firebaseUser.photoURL,
            });

          } else {
            // L'utilisateur est authentifié mais n'a pas de document 'user_root',
            // il doit passer par l'onboarding.
            setUser({
              uid: firebaseUser.uid,
              authUser: firebaseUser,
              isParent: false,
              schoolId: null, // Pas encore d'école
              schools: [],
            });
          }

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
            try {
                const sessionRef = doc(firestore, 'sessions_parents', parentSessionId);
                const sessionDoc = await getDoc(sessionRef);

                if (sessionDoc.exists() && sessionDoc.data().isActive && new Date(sessionDoc.data().expiresAt.toDate()) > new Date()) {
                    setUser({
                      uid: parentSessionId, 
                      isParent: true, 
                      schoolId: parentSchoolId,
                      parentStudentIds: JSON.parse(parentStudentIdsStr),
                      displayName: 'Parent / Tuteur', 
                      authUser: null,
                    });
                } else {
                    localStorage.removeItem('parent_session_id');
                    localStorage.removeItem('parent_school_id');
                    localStorage.removeItem('parent_student_ids');
                    setUser(null);
                }
            } catch (e) {
                console.error("Error validating parent session:", e);
                setUser(null);
            }
         } else {
            setUser(null);
         }
         setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isClient, firestore, auth]);

  const isDirector = user?.profile?.role === 'directeur';
  
  const setActiveSchool = async (schoolId: string) => {
    if (!user || user.isParent || !user.schools?.some(s => s.schoolId === schoolId)) {
        console.error("Action non autorisée ou école invalide.");
        return;
    }
    
    setLoading(true);
    const userRootRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userRootRef, { activeSchoolId: schoolId });
        
        const staffProfileRef = doc(firestore, `ecoles/${schoolId}/personnel/${user.uid}`);
        const profileSnap = await getDoc(staffProfileRef);
        const userProfile = profileSnap.exists() ? profileSnap.data() as UserProfile : undefined;

        setUser(prevUser => {
            if (!prevUser) return null;
            return {
                ...prevUser,
                schoolId: schoolId,
                profile: userProfile,
                displayName: userProfile?.displayName || prevUser.authUser?.displayName,
                photoURL: userProfile?.photoURL || prevUser.authUser?.photoURL,
            };
        });
        
    } catch(e) {
        console.error("Failed to set active school:", e);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading: loading || !isClient,
    hasSchool: !!user?.schoolId,
    schoolId: user?.schoolId,
    isDirector,
    setActiveSchool,
    reloadUser,
  };
}
