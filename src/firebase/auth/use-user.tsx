
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
    customClaims?: {
        [key: string]: any;
    };
    profile?: UserProfile;
}

// All permissions set to true for a director
const directorPermissions: Required<AdminRole['permissions']> = {
    manageUsers: true, viewUsers: true, manageSchools: true, viewSchools: true,
    manageClasses: true, manageGrades: true, manageSystem: true, viewAnalytics: true,
    manageSettings: true, manageBilling: true, manageCommunication: true,
    manageLibrary: true, manageCantine: true, manageTransport: true, manageInternat: true,
    manageInventory: true, manageRooms: true, manageActivities: true, manageMedical: true,
    viewSupportTickets: true, manageSupportTickets: true, apiAccess: true, exportData: true
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
            const tokenResult = await authUser.getIdTokenResult();
            const schoolId = tokenResult.claims.schoolId;
            const isAdminClaim = tokenResult.claims.admin === true;

            let userProfile: UserProfile | undefined = undefined;

            if (schoolId) {
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                const profileSnap = await getDoc(profileRef);
                
                if (profileSnap.exists()) {
                    const profileData = profileSnap.data() as AppUser;
                    const isDirector = profileData.role === 'directeur';
                    
                    userProfile = { 
                        ...profileData,
                        isAdmin: isAdminClaim || isDirector,
                    };

                    if (isDirector) {
                        userProfile.permissions = directorPermissions;
                    } 
                    else if (profileData.adminRole) {
                        const roleRef = doc(firestore, 'admin_roles', profileData.adminRole);
                        const roleSnap = await getDoc(roleRef);
                        if (roleSnap.exists()) {
                            const roleData = roleSnap.data() as AdminRole;
                            userProfile.permissions = roleData.permissions;
                        }
                    } else {
                        userProfile.permissions = {}; // No specific permissions
                    }
                }
            } else if (isAdminClaim) {
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
                customClaims: tokenResult.claims,
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

    