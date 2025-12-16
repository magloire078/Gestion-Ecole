
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
            
            const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);
            const userRootSnap = await getDoc(userRootRef);
            
            const isAdmin = userRootSnap.exists() && userRootSnap.data().isAdmin === true;
            const schoolId = userRootSnap.exists() ? userRootSnap.data().schoolId : null;

            let userProfile: UserProfile | undefined = undefined;

            if (schoolId) {
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                const profileSnap = await getDoc(profileRef);
                
                if (profileSnap.exists()) {
                    const profileData = profileSnap.data() as AppUser;
                    
                    let permissions: Partial<AdminRole['permissions']> = {};

                    if (profileData.role === 'directeur') {
                        permissions.manageSettings = true;
                        permissions.manageUsers = true;
                        permissions.viewUsers = true;
                        permissions.manageBilling = true;
                        permissions.manageClasses = true;
                        permissions.manageGrades = true;
                    }

                    if (profileData.adminRole) {
                        try {
                            const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, profileData.adminRole);
                            const roleSnap = await getDoc(roleRef);
                            if(roleSnap.exists()){
                                const roleData = roleSnap.data() as AdminRole;
                                permissions = { ...permissions, ...roleData.permissions };
                            }
                        } catch (e) {
                            console.error("Error fetching admin role:", e);
                        }
                    }

                    userProfile = { 
                        ...profileData, 
                        isAdmin: isAdmin,
                        permissions: permissions
                    };
                }
            } else if (isAdmin) {
                userProfile = {
                    uid: authUser.uid,
                    email: authUser.email || '',
                    schoolId: '',
                    role: 'directeur', // Treated as platform-wide director
                    firstName: 'Admin',
                    lastName: 'Platform',
                    hireDate: '',
                    baseSalary: 0,
                    isAdmin: true,
                    permissions: { manageSystem: true, manageSchools: true }
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
