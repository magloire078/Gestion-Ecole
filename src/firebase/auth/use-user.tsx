
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole, school } from '@/lib/data-types';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';

export interface UserProfile extends AppUser {
    permissions?: Partial<AdminRole['permissions']>;
    isAdmin?: boolean;
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
  const { schoolData } = useSchoolData();
  const [user, setUser] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
        setUser(null);
        setLoading(false);
        return;
    }
    
    const unsubscribeFromAuth = onIdTokenChanged(auth, async (authUser) => {
        if (authUser) {
            try {
                let tokenResult = await authUser.getIdTokenResult();
                let claims = tokenResult.claims;

                const isSuperAdmin = claims.superAdmin === true;
                const schoolId = claims.schoolId as string | undefined;

                if (isSuperAdmin) {
                    const adminProfile: UserProfile = {
                        uid: authUser.uid, email: authUser.email || '', schoolId: schoolId || 'SUPER_ADMIN',
                        role: 'directeur', firstName: 'Admin', lastName: 'Platform',
                        hireDate: '', baseSalary: 0, isAdmin: true, permissions: { ...allPermissions },
                    };
                    setUser({ authUser, uid: authUser.uid, profile: adminProfile });
                    setLoading(false);
                } else if (schoolId) {
                    const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                    
                    const unsubscribeFromProfile = onSnapshot(profileRef, async (profileSnap) => {
                        if (profileSnap.exists()) {
                            const profileData = profileSnap.data() as AppUser;
                            let permissions: Partial<AdminRole['permissions']> = {};

                            // Critical check: If the user's ID matches the school's directorId, grant all permissions.
                            // This ensures the school creator always has full control.
                            if (schoolData?.directorId === authUser.uid) {
                                permissions = { ...allPermissions };
                            }

                            // If the user also has a specific admin role, merge its permissions.
                            if (profileData.adminRole) {
                                const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, profileData.adminRole);
                                const roleSnap = await getDoc(roleRef);
                                if (roleSnap.exists()) {
                                    const roleData = roleSnap.data() as AdminRole;
                                    // Merge permissions, director's full access takes precedence.
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

                    // Returning this function will be called on cleanup.
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
            setLoading(false);
        }
    });

    return () => unsubscribeFromAuth();
  }, [auth, firestore, schoolData]);

  return {user, loading};
}
