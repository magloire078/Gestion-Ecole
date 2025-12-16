
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole } from '@/lib/data-types';
import { doc, getDoc } from 'firebase/firestore';

export interface UserProfile extends AppUser {
    permissions?: AdminRole['permissions'];
}

export interface UserContext {
    authUser: FirebaseUser;
    customClaims?: {
        [key: string]: any;
    };
    profile?: UserProfile;
}

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
            const tokenResult = await authUser.getIdTokenResult(true); // Force refresh
            const schoolId = tokenResult.claims.schoolId;

            let userProfile: UserProfile | undefined = undefined;

            if (schoolId) {
                // Fetch staff profile
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                const profileSnap = await getDoc(profileRef);
                
                if (profileSnap.exists()) {
                    const profileData = profileSnap.data() as AppUser;
                    userProfile = { ...profileData };

                    // If user is director, grant all permissions for UI purposes
                    if (profileData.role === 'directeur') {
                        userProfile.permissions = {
                            manageUsers: true, viewUsers: true, manageSchools: true, viewSchools: true,
                            manageClasses: true, manageGrades: true, manageSystem: true, viewAnalytics: true,
                            manageSettings: true, manageBilling: true, manageContent: true,
                            viewSupportTickets: true, manageSupportTickets: true, apiAccess: true, exportData: true,
                        };
                    } 
                    // If user has a specific admin role, fetch its permissions
                    else if (profileData.adminRole) {
                        const roleRef = doc(firestore, 'admin_roles', profileData.adminRole);
                        const roleSnap = await getDoc(roleRef);
                        if (roleSnap.exists()) {
                            const roleData = roleSnap.data() as AdminRole;
                            userProfile.permissions = roleData.permissions;
                        }
                    }
                }
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

    