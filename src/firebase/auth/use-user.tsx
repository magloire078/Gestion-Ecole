
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole, school as School, user_root } from '@/lib/data-types';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

export interface UserProfile extends AppUser {
    permissions?: Partial<AdminRole['permissions']>;
    isAdmin?: boolean;
}

export interface UserContext {
  uid: string;
  authUser: FirebaseUser;
  profile?: UserProfile;
}

const allPermissions = {
    manageUsers: true, viewUsers: true, manageSchools: true, viewSchools: true,
    manageClasses: true, manageGrades: true, manageSystem: true, viewAnalytics: true,
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
  const [user, setUser] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null | undefined>(undefined);
  const [isDirector, setIsDirector] = useState(false);

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

      try {
        const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);
        const userRootSnap = await getDoc(userRootRef);

        const effectiveSchoolId = userRootSnap.exists() ? userRootSnap.data().schoolId : null;
        setSchoolId(effectiveSchoolId);
        
        let profileData: AppUser | null = null;
        if (effectiveSchoolId) {
            const profileRef = doc(firestore, `ecoles/${effectiveSchoolId}/personnel`, authUser.uid);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
                profileData = profileSnap.data() as AppUser;
            }
        }

        const tokenResult = await authUser.getIdTokenResult(true);
        const hasSuperAdminClaim = (tokenResult.claims.superAdmin as boolean) || false;
        const hasSuperAdminRoleInProfile = profileData?.isAdmin === true;

        if(hasSuperAdminClaim || hasSuperAdminRoleInProfile) {
            const superAdminProfile: UserProfile = {
                uid: authUser.uid, email: authUser.email || '', schoolId: effectiveSchoolId || '',
                role: 'super_admin', firstName: 'Super', lastName: 'Admin',
                hireDate: '', baseSalary: 0, displayName: 'Super Admin',
                permissions: { ...allPermissions }, isAdmin: true,
            };
             setUser({ authUser, uid: authUser.uid, profile: superAdminProfile });
             setIsDirector(false); // Super admin is not a director of a specific school context
        } else if (effectiveSchoolId) {
            const schoolDocRef = doc(firestore, 'ecoles', effectiveSchoolId);
            const schoolSnap = await getDoc(schoolDocRef);

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
                        permissions = { ...permissions, ...roleSnap.data().permissions };
                    }
                }
                setUser({ authUser, uid: authUser.uid, profile: { ...profileData, permissions, isAdmin: false } });
            } else {
                 setUser({ authUser, uid: authUser.uid, profile: undefined });
            }

        } else {
            setUser({ authUser, uid: authUser.uid, profile: undefined });
            setIsDirector(false);
        }
      } catch (error) {
        console.error("Erreur dans useUser:", error);
        setUser({ authUser, uid: authUser.uid, profile: undefined });
        setSchoolId(null);
        setIsDirector(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return {user, loading, schoolId, isDirector};
}
