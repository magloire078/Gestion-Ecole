
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole, school as School, user_root } from '@/lib/data-types';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';

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
  const [schoolId, setSchoolId] = useState<string | null | undefined>(undefined);
  const [isDirector, setIsDirector] = useState(false);

  useEffect(() => {
    if (!auth || !firestore) {
        setUser(null);
        setSchoolId(null);
        setIsDirector(false);
        setLoading(false);
        return;
    }
    
    const unsubscribeFromAuth = onIdTokenChanged(auth, async (authUser) => {
        setLoading(true);
        if (!authUser) {
            setUser(null);
            setSchoolId(null);
            setIsDirector(false);
            setLoading(false);
            return;
        }

        try {
            const tokenResult = await authUser.getIdTokenResult(true); 
            const claims = tokenResult.claims;
            let effectiveSchoolId = claims.schoolId as string | null;
            
            if (!effectiveSchoolId) {
                 try {
                    const userDoc = await getDoc(doc(firestore, 'utilisateurs', authUser.uid));
                    if (userDoc.exists()) {
                        effectiveSchoolId = userDoc.data()?.schoolId || null;
                    }
                 } catch (e) { console.error("Error fetching user document from Firestore:", e); }
            }

            setSchoolId(effectiveSchoolId || null);
            
            const isSuperAdmin = (claims.superAdmin as boolean) || false;

            if (isSuperAdmin) {
                 const superAdminProfile: UserProfile = {
                    uid: authUser.uid, email: authUser.email || '', schoolId: '',
                    role: 'super_admin', firstName: 'Super', lastName: 'Admin',
                    hireDate: '', baseSalary: 0, displayName: 'Super Admin',
                    permissions: { ...allPermissions }, isAdmin: true,
                };
                setUser({ authUser, uid: authUser.uid, profile: superAdminProfile });
                setIsDirector(false);
                setLoading(false);
                return;
            }

            if (!effectiveSchoolId) {
                setUser({ authUser, uid: authUser.uid, profile: undefined });
                setLoading(false);
                return;
            }

            const schoolDocRef = doc(firestore, 'ecoles', effectiveSchoolId);
            const profileRef = doc(firestore, `ecoles/${effectiveSchoolId}/personnel`, authUser.uid);

            let unsubscribeProfile: () => void = () => {};

            try {
                const schoolSnap = await getDoc(schoolDocRef);
                const isDirectorFlag = schoolSnap.exists() && schoolSnap.data().directorId === authUser.uid;
                setIsDirector(isDirectorFlag);

                unsubscribeProfile = onSnapshot(profileRef, async (profileSnap) => {
                    const profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;

                    if (profileData) {
                        let permissions: Partial<AdminRole['permissions']> = {};
                        if (profileData.role === 'directeur' || isSuperAdmin) {
                            permissions = { ...allPermissions };
                        } else if (profileData.adminRole) {
                            const roleRef = doc(firestore, `ecoles/${effectiveSchoolId}/admin_roles`, profileData.adminRole);
                            const roleSnap = await getDoc(roleRef);
                            if (roleSnap.exists()) {
                                permissions = { ...permissions, ...roleSnap.data().permissions };
                            }
                        }
                        setUser({ authUser, uid: authUser.uid, profile: { ...profileData, permissions, isAdmin: isSuperAdmin } });
                    } else {
                        setUser({ authUser, uid: authUser.uid, profile: undefined });
                    }
                }, (error) => {
                    console.error("Error onSnapshot for user profile:", error);
                    setUser({ authUser, uid: authUser.uid, profile: undefined });
                });
            } catch (e) {
                 console.error("Error fetching initial school/profile data:", e);
                 setUser({ authUser, uid: authUser.uid, profile: undefined });
            }

        } catch (error) {
            console.error("Erreur dans useUser:", error);
             setUser({ authUser, uid: authUser.uid, profile: undefined });
             setSchoolId(null);
        } finally {
            setLoading(false);
        }
    });

    return () => unsubscribeFromAuth();
  }, [auth, firestore]);

  return {user, loading, schoolId, isDirector};
}
