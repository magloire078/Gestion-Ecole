
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
    authUser: FirebaseUser;
    uid: string;
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

  useEffect(() => {
    if (!auth || !firestore) {
        setUser(null);
        setLoading(false);
        return;
    }
    
    const unsubscribeFromAuth = onIdTokenChanged(auth, async (authUser) => {
        if (authUser) {
            const tokenResult = await authUser.getIdTokenResult();
            const claims = tokenResult.claims;
            const isSuperAdmin = claims.superAdmin === true;
            const schoolId = claims.schoolId as string | undefined;

            if (isSuperAdmin) {
                // If user is a super admin, grant all permissions immediately without waiting for Firestore.
                const adminProfile: UserProfile = {
                    uid: authUser.uid,
                    email: authUser.email || '',
                    schoolId: schoolId || '',
                    role: 'directeur',
                    firstName: 'Admin',
                    lastName: 'Platform',
                    hireDate: '',
                    baseSalary: 0,
                    isAdmin: true,
                    permissions: allPermissions,
                };
                setUser({ authUser, uid: authUser.uid, profile: adminProfile });
                setLoading(false);
            } else if (schoolId) {
                // For regular users, proceed with Firestore lookup.
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                
                const unsubscribeFromProfile = onSnapshot(profileRef, (profileSnap) => {
                    if (profileSnap.exists()) {
                        const profileData = profileSnap.data() as AppUser;
                        let permissions: Partial<AdminRole['permissions']> = {};

                        // The user's base role is "directeur" of their school
                        if (profileData.role === 'directeur') {
                           permissions = allPermissions;
                        }
                        
                        const currentUserData = { authUser, uid: authUser.uid, profile: { ...profileData, permissions, isAdmin: isSuperAdmin } };
                        setUser(currentUserData);

                        if (profileData.adminRole) {
                            const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, profileData.adminRole);
                            const unsubscribeFromRole = onSnapshot(roleRef, (roleSnap) => {
                                if (roleSnap.exists()) {
                                    const roleData = roleSnap.data() as AdminRole;
                                    // Merge base permissions with role-specific permissions
                                    const finalPermissions = { ...permissions, ...roleData.permissions };
                                    
                                    setUser(prevUser => ({
                                        ...prevUser!,
                                        profile: { ...prevUser!.profile!, ...profileData, permissions: finalPermissions, isAdmin: isSuperAdmin }
                                    }));
                                }
                            });
                             return () => unsubscribeFromRole();
                        }
                    } else {
                         setUser({ authUser, uid: authUser.uid, profile: undefined });
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile with onSnapshot:", error);
                    setLoading(false);
                });
                return () => unsubscribeFromProfile();

            } else {
                 setUser({ authUser, uid: authUser.uid, profile: undefined });
                 setLoading(false);
            }
        } else {
            setUser(null);
            setLoading(false);
        }
    });

    return () => unsubscribeFromAuth();
  }, [auth, firestore]);

  return {user, loading};
}
