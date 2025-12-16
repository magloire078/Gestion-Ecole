
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole } from '@/lib/data-types';
import { doc, getDoc } from 'firebase/firestore';

export interface UserProfile extends AppUser {
    permissions?: Partial<AdminRole['permissions']>;
    isAdmin?: boolean;
}

export interface UserContext {
    authUser: FirebaseUser;
    uid: string;
    profile?: UserProfile;
}

const directorPermissions: Required<AdminRole['permissions']> = {
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
    
    const unsubscribe = onIdTokenChanged(auth, async (authUser) => {
        if (authUser) {
            
            // Note: We are not using claims for now for simplicity and robustness.
            // Direct document reads are more reliable at this stage.
            // const tokenResult = await authUser.getIdTokenResult();
            // const isAdminClaim = tokenResult.claims.admin === true;

            const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);
            const userRootSnap = await getDoc(userRootRef);
            
            // Check for admin status from a separate, more secure source if possible,
            // or fall back to a specific field in the user's profile for simplicity.
            // Here, we'll assume a field on the user_root for platform-wide admin status.
            const isAdmin = userRootSnap.exists() && userRootSnap.data().isAdmin === true;

            const schoolId = userRootSnap.exists() ? userRootSnap.data().schoolId : null;

            let userProfile: UserProfile | undefined = undefined;

            if (schoolId) {
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                const profileSnap = await getDoc(profileRef);
                
                if (profileSnap.exists()) {
                    const profileData = profileSnap.data() as AppUser;
                    const isDirector = profileData.role === 'directeur';
                    
                    userProfile = { 
                        ...profileData,
                        isAdmin: isAdmin || isDirector, // A director is an admin of their school
                    };

                    if (isDirector) {
                        userProfile.permissions = directorPermissions;
                    } 
                    else if (profileData.adminRole) {
                        const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, profileData.adminRole);
                        const roleSnap = await getDoc(roleRef);
                        if (roleSnap.exists()) {
                            const roleData = roleSnap.data() as AdminRole;
                            userProfile.permissions = roleData.permissions;
                        }
                    } else {
                        userProfile.permissions = {}; // No specific permissions if no adminRole
                    }
                }
            } else if (isAdmin) {
                // Handle platform admin without a specific school
                userProfile = {
                    uid: authUser.uid,
                    email: authUser.email || '',
                    schoolId: '',
                    role: 'directeur', // Consider platform admin as a director-level
                    firstName: authUser.displayName || 'Admin',
                    lastName: 'Platform',
                    hireDate: '',
                    baseSalary: 0,
                    isAdmin: true,
                    permissions: directorPermissions,
                };
            }

            setUser({
                authUser,
                uid: authUser.uid,
                profile: userProfile
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return {user, loading};
}

    