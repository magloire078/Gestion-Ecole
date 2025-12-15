
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole } from '@/lib/data-types';
import { doc, getDoc } from 'firebase/firestore';

export interface User extends FirebaseUser {
    customClaims?: {
        [key: string]: any;
    }
    profile?: AppUser & { permissions?: AdminRole['permissions'] }; 
}

export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [user, setUser] = useState<User | null>(null);
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

            let userProfile: (AppUser & { permissions?: AdminRole['permissions'] }) | undefined = undefined;

            if (schoolId) {
                // Fetch staff profile
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                const profileSnap = await getDoc(profileRef);
                
                if (profileSnap.exists()) {
                    const profileData = profileSnap.data() as AppUser;
                    userProfile = { ...profileData };

                    // If user has an admin role, fetch its permissions
                    if (profileData.adminRole) {
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
                ...authUser,
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
