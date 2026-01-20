

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onIdTokenChanged, getAuth } from 'firebase/auth';
import { useFirestore, useAuth } from '../firebase/client-provider';
import type { UserProfile, user_root, parent as Parent } from '@/lib/data-types';
import { useRouter } from 'next/navigation';

export interface AppUser {
    uid: string;
    isParent: boolean;
    authUser: FirebaseUser | null;
    profile?: UserProfile; 
    parentStudentIds?: string[];
    schoolId?: string | null; // L'école actuellement active
    schools?: { [key: string]: string }; // Toutes les écoles de l'utilisateur
    displayName?: string | null;
    photoURL?: string | null;
    email?: string | null;
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const reloadUser = useCallback(async () => {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      if (currentUser) {
        // Force a refresh of the ID token, which will trigger onIdTokenChanged
        await currentUser.getIdToken(true);
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
            const schoolAffiliations = userData.schools || {};
            const schoolIds = Object.keys(schoolAffiliations);
            const activeSchoolId = userData.activeSchoolId && schoolAffiliations[userData.activeSchoolId]
                ? userData.activeSchoolId
                : schoolIds[0] || null;
            
            if (activeSchoolId) {
                const activeRole = schoolAffiliations[activeSchoolId];
                
                if (activeRole === 'parent') {
                    // This is a parent user for the active school
                    const parentProfileRef = doc(firestore, `ecoles/${activeSchoolId}/parents/${firebaseUser.uid}`);
                    const parentProfileSnap = await getDoc(parentProfileRef);
                    const parentData = parentProfileSnap.data() as Parent;
                    
                    setUser({
                        uid: firebaseUser.uid,
                        authUser: firebaseUser,
                        isParent: true,
                        schoolId: activeSchoolId,
                        schools: schoolAffiliations,
                        parentStudentIds: parentData?.studentIds || [],
                        displayName: parentData?.displayName || firebaseUser.displayName,
                        email: firebaseUser.email,
                        photoURL: parentData?.photoURL || firebaseUser.photoURL,
                    });

                } else {
                    // This is a staff member
                    const staffProfileRef = doc(firestore, `ecoles/${activeSchoolId}/personnel/${firebaseUser.uid}`);
                    const profileSnap = await getDoc(staffProfileRef);
                    let userProfile: UserProfile | undefined = undefined;
                    
                    if (profileSnap.exists()) {
                        userProfile = profileSnap.data() as UserProfile;
                        if (userProfile.adminRole) {
                            const roleRef = doc(firestore, `ecoles/${activeSchoolId}/admin_roles/${userProfile.adminRole}`);
                            const roleSnap = await getDoc(roleRef);
                            if (roleSnap.exists()) {
                                userProfile.permissions = roleSnap.data().permissions;
                            }
                        }
                    }
                    
                    setUser({
                        uid: firebaseUser.uid,
                        authUser: firebaseUser,
                        isParent: false,
                        schoolId: activeSchoolId,
                        schools: schoolAffiliations,
                        profile: userProfile,
                        displayName: userProfile?.displayName || firebaseUser.displayName,
                        email: firebaseUser.email,
                        photoURL: userProfile?.photoURL || firebaseUser.photoURL,
                    });
                }
            } else {
                 // Authenticated user with a user_root doc, but no active school (e.g. affiliation removed)
                 setUser({ uid: firebaseUser.uid, authUser: firebaseUser, isParent: false, schoolId: null, schools: schoolAffiliations, displayName: firebaseUser.displayName, email: firebaseUser.email, photoURL: firebaseUser.photoURL });
            }

          } else {
            // Authenticated user but no user_root doc -> needs onboarding
             setUser({ uid: firebaseUser.uid, authUser: firebaseUser, isParent: false, schoolId: null, schools: {}, displayName: firebaseUser.displayName, email: firebaseUser.email, photoURL: firebaseUser.photoURL });
          }

        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        } finally {
            setLoading(false);
        }
      } else {
         // No firebaseUser, so no user is logged in.
         setUser(null);
         setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isClient, firestore, auth, reloadUser, router]); // router added to deps

  const isDirector = user?.profile?.role === 'directeur';
  
  const setActiveSchool = async (schoolId: string) => {
    if (!user || user.isParent || !user.schools || !user.schools[schoolId]) {
        console.error("Action non autorisée ou école invalide.");
        return;
    }
    
    setLoading(true);
    const userRootRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userRootRef, { activeSchoolId: schoolId });
        await reloadUser();
        router.refresh(); 
    } catch(e) {
        console.error("Failed to set active school:", e);
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
