
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole, school as School, user_root } from '@/lib/data-types';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

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
            
            // Fallback to Firestore if claim is not present
            if (!effectiveSchoolId) {
                 try {
                    const userDoc = await getDoc(doc(firestore, 'utilisateurs', authUser.uid));
                    if (userDoc.exists()) {
                        effectiveSchoolId = userDoc.data()?.schoolId || null;
                    }
                 } catch (e) { console.error("Error fetching user root document:", e); }
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

            // --- Start of refactored logic ---
            const schoolDocRef = doc(firestore, 'ecoles', effectiveSchoolId);
            const profileRef = doc(firestore, `ecoles/${effectiveSchoolId}/personnel`, authUser.uid);
            
            const [schoolSnap, profileSnap] = await Promise.all([
                getDoc(schoolDocRef),
                getDoc(profileRef)
            ]);

            const isDirectorFlag = schoolSnap.exists() && schoolSnap.data().directorId === authUser.uid;
            setIsDirector(isDirectorFlag);

            const profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;

            if (profileData) {
                let permissions: Partial<AdminRole['permissions']> = {};

                if (isDirectorFlag) {
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
            // --- End of refactored logic ---

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
