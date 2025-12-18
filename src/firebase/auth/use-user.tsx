
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
            const isAdmin = claims.superAdmin === true;
            const schoolId = claims.schoolId as string | undefined;

            if (schoolId) {
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                
                const unsubscribeFromProfile = onSnapshot(profileRef, (profileSnap) => {
                    if (profileSnap.exists()) {
                        const profileData = profileSnap.data() as AppUser;
                        let permissions: Partial<AdminRole['permissions']> = {};

                        if (profileData.role === 'directeur' || isAdmin) {
                            permissions = {
                                manageSettings: true, manageUsers: true, viewUsers: true,
                                manageBilling: true, manageClasses: true, manageGrades: true,
                                manageCommunication: true, manageLibrary: true, manageCantine: true,
                                manageTransport: true, manageInternat: true, manageInventory: true,
                                manageRooms: true, manageActivities: true, manageMedical: true,
                                manageSchedule: true, manageAttendance: true,
                            };
                        }
                        
                        const currentUserData = { authUser, uid: authUser.uid, profile: { ...profileData, permissions, isAdmin } };
                        setUser(currentUserData);

                        if (profileData.adminRole) {
                            const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, profileData.adminRole);
                            // Switch to onSnapshot for roles as well
                            const unsubscribeFromRole = onSnapshot(roleRef, (roleSnap) => {
                                if (roleSnap.exists()) {
                                    const roleData = roleSnap.data() as AdminRole;
                                    const finalPermissions = { ...permissions, ...roleData.permissions };
                                    
                                    setUser(prevUser => ({
                                        ...prevUser!,
                                        profile: { ...prevUser!.profile!, ...profileData, permissions: finalPermissions, isAdmin }
                                    }));
                                }
                            });
                             // Return the role unsubscriber when profile unsubscribes
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

            } else if (isAdmin) {
                const userProfile: UserProfile = {
                    uid: authUser.uid,
                    email: authUser.email || '',
                    schoolId: '',
                    role: 'directeur',
                    firstName: 'Admin',
                    lastName: 'Platform',
                    hireDate: '',
                    baseSalary: 0,
                    isAdmin: true,
                    permissions: { manageSystem: true, manageSchools: true }
                };
                setUser({ authUser, uid: authUser.uid, profile: userProfile });
                setLoading(false);
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
