
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole } from '@/lib/data-types';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

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
            try {
                let tokenResult = await authUser.getIdTokenResult(true);
                let claims = tokenResult.claims;

                const isSuperAdmin = claims.superAdmin === true;
                const currentSchoolId = claims.schoolId as string | undefined;
                const directorClaim = claims.isDirector === true;
                
                setSchoolId(currentSchoolId || null);
                setIsDirector(directorClaim);

                if (isSuperAdmin) {
                    const adminProfile: UserProfile = {
                        uid: authUser.uid, email: authUser.email || '', schoolId: 'SUPER_ADMIN',
                        role: 'directeur', firstName: 'Admin', lastName: 'Platform',
                        hireDate: '', baseSalary: 0, isAdmin: true, permissions: { ...allPermissions },
                    };
                    setUser({ authUser, uid: authUser.uid, profile: adminProfile });
                    setLoading(false);
                    return; // Stop further processing
                } 
                
                if (currentSchoolId) {
                    const profileRef = doc(firestore, `ecoles/${currentSchoolId}/personnel`, authUser.uid);
                    
                    const unsubscribeFromProfile = onSnapshot(profileRef, async (profileSnap) => {
                        if (profileSnap.exists()) {
                            const profileData = profileSnap.data() as AppUser;
                            let permissions: Partial<AdminRole['permissions']> = {};

                            if (directorClaim) {
                                permissions = { ...allPermissions };
                            }

                            if (profileData.adminRole) {
                                const roleRef = doc(firestore, `ecoles/${currentSchoolId}/admin_roles`, profileData.adminRole);
                                const roleSnap = await getDoc(roleRef);
                                if (roleSnap.exists()) {
                                    const roleData = roleSnap.data() as AdminRole;
                                    permissions = { ...permissions, ...roleData.permissions };
                                }
                            }
                            setUser({ authUser, uid: authUser.uid, profile: { ...profileData, permissions, isAdmin: isSuperAdmin } });
                        } else {
                             setUser({ authUser, uid: authUser.uid, profile: undefined });
                        }
                        setLoading(false);
                    }, (error) => {
                        console.error("Error fetching user profile:", error);
                        setLoading(false);
                    });

                    return () => unsubscribeFromProfile();
                } else {
                     setUser({ authUser, uid: authUser.uid, profile: undefined });
                     setLoading(false);
                }
            } catch (error) {
                console.error("Error getting id token result", error);
                setUser(null);
                setLoading(false);
            }
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

    