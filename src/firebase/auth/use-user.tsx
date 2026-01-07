

'use client';

import {useState, useEffect, useCallback} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole, school as School, user_root } from '@/lib/data-types';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

export interface UserProfile extends AppUser {
    permissions?: Partial<AdminRole['permissions']>;
    isAdmin?: boolean;
}

export interface CombinedUser {
    uid: string;
    authUser?: FirebaseUser;
    profile?: UserProfile;
    isParent?: boolean;
    parentStudentIds?: string[];
    schoolId?: string;
    displayName?: string;
    photoURL?: string;
    email?: string;
}


const allPermissions = {
    manageUsers: true, viewUsers: true, manageSchools: true, viewSchools: true,
    manageClasses: true, manageGrades: true, manageDiscipline: true, manageSystem: true, viewAnalytics: true,
    manageSettings: true, manageBilling: true, manageCommunication: true,
    manageSchedule: true, manageAttendance: true, manageLibrary: true, manageCantine: true,
    manageTransport: true, manageInternat: true, manageInventory: true,
    manageRooms: true, manageActivities: true, manageMedical: true,
    viewSupportTickets: true, manageSupportTickets: true, apiAccess: true,
    exportData: true
};

export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<CombinedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDirector, setIsDirector] = useState(false);

  const fetchFullUserProfile = useCallback(async (authUser: FirebaseUser, userRootData: user_root) => {
    try {
      const { schoolId } = userRootData;
      const tokenResult = await authUser.getIdTokenResult(true);
      const isSuperAdmin = !!tokenResult.claims.superAdmin;

      if (isSuperAdmin) {
          const superAdminProfile: UserProfile = {
              uid: authUser.uid, email: authUser.email || '', schoolId: schoolId || '',
              role: 'super_admin' as any, firstName: 'Super', lastName: 'Admin',
              hireDate: '', baseSalary: 0, displayName: 'Super Admin',
              permissions: { ...allPermissions }, isAdmin: true,
          };
           setUser({ authUser, uid: authUser.uid, profile: superAdminProfile, schoolId: schoolId, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
           setIsDirector(false);
      } else if (schoolId) {
          const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
          const schoolDocRef = doc(firestore, 'ecoles', schoolId);
          
          const [profileSnap, schoolSnap] = await Promise.all([
              getDoc(profileRef),
              getDoc(schoolDocRef)
          ]);

          const profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;
          const isDirectorFlag = schoolSnap.exists() && schoolSnap.data().directorId === authUser.uid;
          setIsDirector(isDirectorFlag);
          
          if (profileData) {
              let permissions: Partial<AdminRole['permissions']> = {};
              if (isDirectorFlag) {
                  permissions = { ...allPermissions };
              } else if (profileData.adminRole) {
                  const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, profileData.adminRole);
                  const roleSnap = await getDoc(roleRef);
                  if (roleSnap.exists()) {
                      permissions = roleSnap.data().permissions || {};
                  }
              }
              setUser({ authUser, uid: authUser.uid, schoolId: schoolId, profile: { ...profileData, permissions, isAdmin: false }, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
          } else {
               setUser({ authUser, uid: authUser.uid, schoolId: schoolId, profile: undefined, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
          }
      } else {
          // Utilisateur authentifié mais sans école associée
          setUser({ authUser, uid: authUser.uid, profile: undefined, schoolId: undefined, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
          setIsDirector(false);
      }
    } catch (error) {
      console.error("Erreur dans useUser fetchUserData:", error);
      setUser({ authUser, uid: authUser.uid, profile: undefined, schoolId: undefined, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
      setIsDirector(false);
    } finally {
      setLoading(false);
    }
  }, [firestore]);


  useEffect(() => {
    if (!auth || !firestore) {
        setLoading(false);
        return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (authUser) => {
      if (!authUser) {
        setUser(null);
        setIsDirector(false);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      // Écouter les changements en temps réel sur le document racine de l'utilisateur
      const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);
      const unsubUserDoc = onSnapshot(userRootRef, (userRootSnap) => {
          if (userRootSnap.exists()) {
              fetchFullUserProfile(authUser, userRootSnap.data() as user_root);
          } else {
              // L'utilisateur est authentifié mais n'a pas encore de document racine (onboarding)
              setUser({ authUser, uid: authUser.uid, profile: undefined, schoolId: undefined, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
              setIsDirector(false);
              setLoading(false);
          }
      }, (error) => {
          console.error("Erreur de snapshot sur le document utilisateur:", error);
          setUser(null);
          setIsDirector(false);
          setLoading(false);
      });
      
      return () => unsubUserDoc();
    });

    return () => unsubscribe();
  }, [auth, firestore, fetchFullUserProfile]);
  
  const reloadUser = useCallback(async () => {
    const firebaseUser = auth?.currentUser;
    if (firebaseUser) {
        setLoading(true);
        // Forcer le rafraîchissement du token
        await firebaseUser.getIdToken(true);
        const userRootRef = doc(firestore, 'utilisateurs', firebaseUser.uid);
        const userRootSnap = await getDoc(userRootRef);
        if (userRootSnap.exists()) {
            await fetchFullUserProfile(firebaseUser, userRootSnap.data() as user_root);
        } else {
            setUser({ authUser: firebaseUser, uid: firebaseUser.uid, profile: undefined, schoolId: undefined, displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, email: firebaseUser.email });
            setIsDirector(false);
            setLoading(false);
        }
    }
  }, [auth, firestore, fetchFullUserProfile]);

  return {user, loading, isDirector, reloadUser, schoolId: user?.schoolId};
}

    
