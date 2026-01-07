

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
  const [schoolId, setSchoolId] = useState<string | null | undefined>(undefined);
  const [isDirector, setIsDirector] = useState(false);

  const fetchFullUserProfile = useCallback(async (authUser: FirebaseUser, userRootData: user_root) => {
    try {
      const effectiveSchoolId = userRootData.schoolId;
      setSchoolId(effectiveSchoolId);

      const tokenResult = await authUser.getIdTokenResult(true);
      const isSuperAdmin = (tokenResult.claims.superAdmin as boolean) === true;

      if (isSuperAdmin) {
          const superAdminProfile: UserProfile = {
              uid: authUser.uid, email: authUser.email || '', schoolId: effectiveSchoolId || '',
              role: 'super_admin' as any, firstName: 'Super', lastName: 'Admin',
              hireDate: '', baseSalary: 0, displayName: 'Super Admin',
              permissions: { ...allPermissions }, isAdmin: true,
          };
           setUser({ authUser, uid: authUser.uid, profile: superAdminProfile, schoolId: effectiveSchoolId });
           setIsDirector(false);
      } else if (effectiveSchoolId) {
          const profileRef = doc(firestore, `ecoles/${effectiveSchoolId}/personnel`, authUser.uid);
          const schoolDocRef = doc(firestore, 'ecoles', effectiveSchoolId);
          
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
                  const roleRef = doc(firestore, `ecoles/${effectiveSchoolId}/admin_roles`, profileData.adminRole);
                  const roleSnap = await getDoc(roleRef);
                  if (roleSnap.exists()) {
                      permissions = roleSnap.data().permissions || {};
                  }
              }
              setUser({ authUser, uid: authUser.uid, schoolId: effectiveSchoolId, profile: { ...profileData, permissions, isAdmin: false } });
          } else {
               setUser({ authUser, uid: authUser.uid, schoolId: effectiveSchoolId, profile: undefined });
          }
      } else {
          setUser({ authUser, uid: authUser.uid, profile: undefined, schoolId: null });
          setIsDirector(false);
      }
    } catch (error) {
      console.error("Erreur dans useUser fetchUserData:", error);
      setUser({ authUser, uid: authUser.uid, profile: undefined, schoolId: null });
      setSchoolId(null);
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
        setSchoolId(null);
        setIsDirector(false);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      // Écouter les changements en temps réel sur le document racine de l'utilisateur
      const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);
      const unsubUserDoc = onSnapshot(userRootRef, (userRootSnap) => {
          if (userRootSnap.exists()) {
              const userRootData = userRootSnap.data() as user_root;
              fetchFullUserProfile(authUser, userRootData);
          } else {
              // L'utilisateur est authentifié mais n'a pas encore de document racine (onboarding)
              setSchoolId(null);
              setUser({ authUser, uid: authUser.uid, profile: undefined, schoolId: null });
              setIsDirector(false);
              setLoading(false);
          }
      }, (error) => {
          console.error("Erreur de snapshot sur le document utilisateur:", error);
          setUser(null);
          setSchoolId(null);
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
            setSchoolId(null);
            setUser({ authUser: firebaseUser, uid: firebaseUser.uid, profile: undefined, schoolId: null });
            setIsDirector(false);
            setLoading(false);
        }
    }
  }, [auth, firestore, fetchFullUserProfile]);

  return {user, loading, schoolId, isDirector, reloadUser};
}

    