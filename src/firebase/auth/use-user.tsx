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
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isDirector, setIsDirector] = useState(false);

  useEffect(() => {
    if (!auth || !firestore) {
        setUser(null);
        setLoading(false);
        return;
    }
    
    const unsubscribeFromAuth = onIdTokenChanged(auth, async (authUser) => {
        setLoading(true);
        if (authUser) {
             const tokenResult = await authUser.getIdTokenResult();
             const claims = tokenResult.claims;
             const currentSchoolId = (claims.schoolId as string) || null;
             const isSuperAdmin = (claims.superAdmin as boolean) || false;
             
             let effectiveSchoolId = currentSchoolId;

             // Super admin case
             if (isSuperAdmin) {
                 const superAdminProfile: UserProfile = {
                     uid: authUser.uid,
                     email: authUser.email || '',
                     schoolId: '',
                     role: 'super_admin',
                     firstName: 'Super',
                     lastName: 'Admin',
                     hireDate: '',
                     baseSalary: 0,
                     displayName: 'Super Admin',
                     permissions: { ...allPermissions },
                     isAdmin: true,
                 }
                 setUser({ authUser, uid: authUser.uid, profile: superAdminProfile });
                 setSchoolId(null);
                 setIsDirector(false);
                 setLoading(false);
                 return;
             }
             
            if (!effectiveSchoolId) {
                // Fallback for just-created schools where claim might not be set yet
                const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);
                const userRootSnap = await getDoc(userRootRef).catch(() => null);
                if (userRootSnap && userRootSnap.exists()) {
                    const userRootData = userRootSnap.data() as user_root;
                    if(userRootData.schoolId) {
                        effectiveSchoolId = userRootData.schoolId;
                    }
                }
            }
            
            setSchoolId(effectiveSchoolId);

            if (!effectiveSchoolId) {
                 setUser({ authUser, uid: authUser.uid, profile: undefined });
                 setLoading(false);
                 return;
            }

            // User is associated with a school
            const profileRef = doc(firestore, `ecoles/${effectiveSchoolId}/personnel`, authUser.uid);
            
            const unsubscribeProfile = onSnapshot(profileRef, async (profileSnap) => {
                const schoolRef = doc(firestore, 'ecoles', effectiveSchoolId!);
                const schoolSnap = await getDoc(schoolRef);
                const schoolData = schoolSnap.exists() ? schoolSnap.data() as School : null;
                const isDirectorFlag = schoolData?.directorId === authUser.uid;
                setIsDirector(isDirectorFlag);
                
                let profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;

                if (isDirectorFlag && !profileData) {
                    const nameParts = authUser.displayName?.split(' ') || [];
                    profileData = {
                        uid: authUser.uid, schoolId: effectiveSchoolId!, role: 'directeur',
                        firstName: nameParts[0] || 'Directeur', lastName: nameParts.slice(1).join(' ') || 'Principal',
                        displayName: authUser.displayName || `${nameParts[0]} ${nameParts.slice(1).join(' ')}`,
                        email: authUser.email || '', hireDate: format(new Date(), 'yyyy-MM-dd'),
                        baseSalary: 0, status: 'Actif', photoURL: authUser.photoURL || ''
                    };
                    await setDoc(profileRef, profileData);
                }

                if (profileData) {
                    let permissions: Partial<AdminRole['permissions']> = {};

                    if (isDirectorFlag) {
                        permissions = { ...allPermissions };
                    }
                    
                    if (profileData.adminRole) {
                        const roleRef = doc(firestore, `ecoles/${effectiveSchoolId!}/admin_roles`, profileData.adminRole);
                        const roleSnap = await getDoc(roleRef).catch(() => null);
                        if (roleSnap && roleSnap.exists()) {
                            permissions = { ...roleSnap.data().permissions, ...permissions };
                        }
                    }
                    setUser({ authUser, uid: authUser.uid, profile: { ...profileData, permissions, isAdmin: isSuperAdmin } });
                } else {
                     setUser({ authUser, uid: authUser.uid, profile: undefined });
                }
                 setLoading(false);
            }, (error) => {
                console.error("Error onSnapshot for user profile:", error);
                setLoading(false);
            });

            return () => unsubscribeProfile();

        } else {
            setUser(null);
            setSchoolId(null);
            setIsDirector(false);
            setLoading(false);
        }
    });

    return () => unsubscribeFromAuth();
  }, [auth, firestore]);

  return {user, loading, schoolId, isDirector};
}
