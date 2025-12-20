
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

        const tokenResult = await authUser.getIdTokenResult(); // Correction: ne pas forcer le refresh ici
        const claims = tokenResult.claims;
        const isSuperAdmin = (claims.superAdmin as boolean) || false;

        // Super admin handling
        if (isSuperAdmin) {
            const superAdminProfile: UserProfile = {
                uid: authUser.uid, email: authUser.email || '', schoolId: '',
                role: 'super_admin', firstName: 'Super', lastName: 'Admin',
                hireDate: '', baseSalary: 0, displayName: 'Super Admin',
                permissions: { ...allPermissions }, isAdmin: true,
            };
            setUser({ authUser, uid: authUser.uid, profile: superAdminProfile });
            setSchoolId(null);
            setIsDirector(false);
            setLoading(false);
            return;
        }

        let effectiveSchoolId = (claims.schoolId as string) || null;
        
        if (!effectiveSchoolId) {
            try {
                const userRootSnap = await getDoc(doc(firestore, 'utilisateurs', authUser.uid));
                if (userRootSnap.exists()) {
                    effectiveSchoolId = (userRootSnap.data() as user_root).schoolId;
                }
            } catch (e) {
                console.error("Could not read user root document, this may be normal during onboarding.", e);
            }
        }
        
        setSchoolId(effectiveSchoolId);

        if (!effectiveSchoolId) {
            setUser({ authUser, uid: authUser.uid, profile: undefined });
            setLoading(false);
            return;
        }

        // User is associated with a school, now fetch profile and roles
        const schoolDocRef = doc(firestore, 'ecoles', effectiveSchoolId);
        const profileRef = doc(firestore, `ecoles/${effectiveSchoolId}/personnel`, authUser.uid);

        let unsubscribeProfile: () => void = () => {};

        try {
            const schoolSnap = await getDoc(schoolDocRef);
            const isDirectorFlag = schoolSnap.exists() && schoolSnap.data().directorId === authUser.uid;
            setIsDirector(isDirectorFlag);

            unsubscribeProfile = onSnapshot(profileRef, async (profileSnap) => {
                let profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;

                if (isDirectorFlag && !profileData) {
                    const nameParts = authUser.displayName?.split(' ') || ['Nouveau', 'Directeur'];
                    profileData = {
                        uid: authUser.uid, schoolId: effectiveSchoolId, role: 'directeur',
                        firstName: nameParts[0], lastName: nameParts.slice(1).join(' '),
                        displayName: authUser.displayName || `${nameParts[0]} ${nameParts.slice(1).join(' ')}`,
                        email: authUser.email || '', hireDate: format(new Date(), 'yyyy-MM-dd'),
                        baseSalary: 0, status: 'Actif', photoURL: authUser.photoURL || '',
                    };
                    setDoc(profileRef, profileData, { merge: true });
                }

                if (profileData) {
                    let permissions: Partial<AdminRole['permissions']> = {};
                    if (isDirectorFlag) {
                        permissions = { ...allPermissions };
                    }
                    if (profileData.adminRole) {
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
                setLoading(false);
            }, (error) => {
                console.error("Error onSnapshot for user profile:", error);
                setUser({ authUser, uid: authUser.uid, profile: undefined });
                setLoading(false);
            });
        } catch (e) {
             console.error("Error fetching initial school/profile data:", e);
             setUser({ authUser, uid: authUser.uid, profile: undefined });
             setLoading(false);
        }

        return () => unsubscribeProfile();

    });

    return () => unsubscribeFromAuth();
  }, [auth, firestore]);

  return {user, loading, schoolId, isDirector};
}
