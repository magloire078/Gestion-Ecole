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
    authUser: FirebaseUser;
    profile?: UserProfile;
    isParent?: false; // Explicitly not a parent in this context
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
  const [isDirector, setIsDirector] = useState(false);
  const [loading, setLoading] = useState(true);

  const reloadUser = useCallback(async () => {
     if (auth?.currentUser) {
       await auth.currentUser.getIdToken(true);
     }
  }, [auth]);

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
      const userRootRef = doc(firestore, 'users', authUser.uid);

      const unsubUserDoc = onSnapshot(userRootRef, async (userRootSnap) => {
        try {
            const tokenResult = await authUser.getIdTokenResult(true);
            const isSuperAdmin = !!tokenResult.claims.superAdmin;
            
            const schoolId = userRootSnap.exists() ? userRootSnap.data().schoolId : undefined;

            if (isSuperAdmin) {
                const superAdminProfile: UserProfile = {
                    uid: authUser.uid, email: authUser.email || '', schoolId: schoolId || '',
                    role: 'super_admin' as any, firstName: 'Super', lastName: 'Admin',
                    hireDate: '', baseSalary: 0, displayName: 'Super Admin',
                    permissions: { ...allPermissions }, isAdmin: true,
                };
                setUser({ authUser, uid: authUser.uid, profile: superAdminProfile, schoolId: schoolId, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email, isParent: false });
                setIsDirector(false);
            } else if (schoolId) {
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                const schoolDocRef = doc(firestore, 'ecoles', schoolId);
                
                const [profileSnap, schoolSnap] = await Promise.all([getDoc(profileRef), getDoc(schoolDocRef)]);
                
                const profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;
                const isDirectorFlag = schoolSnap.exists() && schoolSnap.data().directorId === authUser.uid;
                setIsDirector(isDirectorFlag);
                
                let permissions: Partial<AdminRole['permissions']> = {};
                if (isDirectorFlag) {
                    permissions = { ...allPermissions };
                } else if (profileData?.adminRole) {
                    const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, profileData.adminRole);
                    const roleSnap = await getDoc(roleRef);
                    permissions = roleSnap.exists() ? roleSnap.data().permissions || {} : {};
                }

                setUser({ authUser, uid: authUser.uid, schoolId: schoolId, profile: { ...profileData, permissions, isAdmin: false } as UserProfile, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email, isParent: false });
            } else {
                setUser({ authUser, uid: authUser.uid, profile: undefined, schoolId: undefined, isParent: false, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
                setIsDirector(false);
            }
        } catch (err) {
            console.error("Error processing user state:", err);
            setUser(null);
            setIsDirector(false);
        } finally {
            setLoading(false);
        }
      }, (error) => {
          console.error("Snapshot error on user document:", error);
          setUser(null);
          setIsDirector(false);
          setLoading(false);
      });
      
      return () => unsubUserDoc();
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return {user, loading, isDirector, reloadUser, schoolId: user?.schoolId};
}
