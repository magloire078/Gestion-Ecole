
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole, school as School } from '@/lib/data-types';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

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
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isDirector, setIsDirector] = useState(false);

  useEffect(() => {
    if (!auth || !firestore) {
        setUser(null);
        setLoading(false);
        return;
    }
    
    const unsubscribeFromAuth = onIdTokenChanged(auth, async (authUser) => {
        setLoading(true);
        if (authUser) {
            try {
                // First, get the root user doc to find the schoolId
                const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);
                const userRootSnap = await getDoc(userRootRef);
                const currentSchoolId = userRootSnap.exists() ? (userRootSnap.data() as user_root).schoolId : null;

                setSchoolId(currentSchoolId);

                if (!currentSchoolId) {
                    // This user is authenticated but not associated with a school yet.
                    setUser({ authUser, uid: authUser.uid, profile: undefined });
                    setLoading(false);
                    return;
                }
                
                // Now, with schoolId, fetch school and profile data
                const schoolRef = doc(firestore, 'ecoles', currentSchoolId);
                const profileRef = doc(firestore, `ecoles/${currentSchoolId}/personnel`, authUser.uid);

                const unsubscribe = onSnapshot(profileRef, async (profileSnap) => {
                    const schoolSnap = await getDoc(schoolRef);
                    const schoolData = schoolSnap.exists() ? schoolSnap.data() as School : null;
                    const directorFlag = schoolData?.directorId === authUser.uid;
                    setIsDirector(directorFlag);

                    if (profileSnap.exists()) {
                        const profileData = profileSnap.data() as AppUser;
                        let permissions: Partial<AdminRole['permissions']> = {};

                        // The director of the school gets all permissions, always.
                        if (directorFlag) {
                            permissions = { ...allPermissions };
                        }

                        // If the user has an adminRole, merge those permissions.
                        if (profileData.adminRole) {
                            const roleRef = doc(firestore, `ecoles/${currentSchoolId}/admin_roles`, profileData.adminRole);
                            const roleSnap = await getDoc(roleRef);
                            if (roleSnap.exists()) {
                                const roleData = roleSnap.data() as AdminRole;
                                permissions = { ...permissions, ...roleData.permissions };
                            }
                        }
                        setUser({ authUser, uid: authUser.uid, profile: { ...profileData, permissions } });
                    } else {
                         setUser({ authUser, uid: authUser.uid, profile: undefined });
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error onSnapshot for user profile:", error);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error in auth state change handling", error);
                setUser(null);
                setLoading(false);
            }
        } else {
            setUser(null);
            setSchoolId(null);
            setIsDirector(false);
            setLoading(false);
        }
    });

    return () => unsubscribeFromAuth();
  }, [auth, firestore]);

  return {user, loading, schoolId, isDirector};
}
