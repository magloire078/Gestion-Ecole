
'use client';

import {useState, useEffect, useCallback} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole } from '@/lib/data-types';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export interface UserProfile extends AppUser {
    permissions?: Partial<AdminRole['permissions']>;
    isAdmin?: boolean;
}

export interface CombinedUser {
    uid: string;
    isParent: boolean;
    authUser?: FirebaseUser;
    profile?: UserProfile;
    parentStudentIds?: string[];
    schoolId?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    email?: string | null;
}

const allPermissions = {
    manageUsers: true, viewUsers: true, manageSchools: true, viewSchools: true,
    manageClasses: true, manageGrades: true, manageDiscipline: true, manageSystem: true, viewAnalytics: true,
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
  const [user, setUser] = useState<CombinedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDirector, setIsDirector] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const reloadUser = useCallback(async () => {
     if (auth?.currentUser) {
       await auth.currentUser.getIdToken(true);
     }
  }, [auth]);

  useEffect(() => {
    if (!isClient || !auth || !firestore) {
      if(!isClient) setLoading(false);
      return;
    }

    let isParentSession = false;
    try {
        const sessionId = localStorage.getItem('parent_session_id');
        const sessionSchoolId = localStorage.getItem('parent_school_id');
        const studentIdsStr = localStorage.getItem('parent_student_ids');

        if (sessionId && sessionSchoolId && studentIdsStr) {
            isParentSession = true;
            setUser({
                uid: sessionId,
                isParent: true,
                schoolId: sessionSchoolId,
                parentStudentIds: JSON.parse(studentIdsStr),
                displayName: 'Parent / Tuteur',
            });
            setLoading(false);
        }
    } catch(e) {
        console.error("Error reading parent session", e);
    }
    
    if (isParentSession) {
        return; 
    }
    
    const unsubscribe = onIdTokenChanged(auth, async (authUser) => {
      if (!authUser) {
        setUser(null);
        setIsDirector(false);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const userRootRef = doc(firestore, 'users', authUser.uid);

      const unsubUserDoc = onSnapshot(userRootRef, async (userRootSnap) => {
        try {
            const tokenResult = await authUser.getIdTokenResult(true);
            const isSuperAdmin = !!tokenResult.claims.superAdmin;
            
            const currentSchoolId = userRootSnap.exists() ? userRootSnap.data().schoolId : null;

            if (isSuperAdmin) {
                const superAdminProfile: UserProfile = {
                    uid: authUser.uid, email: authUser.email || '', schoolId: currentSchoolId || '',
                    role: 'super_admin' as any, firstName: 'Super', lastName: 'Admin',
                    hireDate: '', baseSalary: 0, displayName: 'Super Admin',
                    permissions: { ...allPermissions }, isAdmin: true,
                };
                setUser({ authUser, uid: authUser.uid, profile: superAdminProfile, schoolId: currentSchoolId, displayName: 'Super Admin', photoURL: authUser.photoURL, email: authUser.email, isParent: false });
                setIsDirector(false);
            } else if (currentSchoolId) {
                const profileRef = doc(firestore, `ecoles/${currentSchoolId}/personnel`, authUser.uid);
                const schoolDocRef = doc(firestore, 'ecoles', currentSchoolId);
                
                const [profileSnap, schoolSnap] = await Promise.all([getDoc(profileRef), getDoc(schoolDocRef)]);
                
                const profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;
                const isDirectorFlag = schoolSnap.exists() && schoolSnap.data().directorId === authUser.uid;
                setIsDirector(isDirectorFlag);
                
                let permissions: Partial<AdminRole['permissions']> = {};
                if (isDirectorFlag) {
                    permissions = { ...allPermissions };
                } else if (profileData?.adminRole) {
                    const roleRef = doc(firestore, `ecoles/${currentSchoolId}/admin_roles`, profileData.adminRole);
                    const roleSnap = await getDoc(roleRef);
                    permissions = roleSnap.exists() ? roleSnap.data().permissions || {} : {};
                }

                setUser({ authUser, uid: authUser.uid, schoolId: currentSchoolId, profile: { ...profileData, permissions, isAdmin: false } as UserProfile, displayName: profileData?.displayName || authUser.displayName, photoURL: profileData?.photoURL || authUser.photoURL, email: authUser.email, isParent: false });
            } else {
                setUser({ authUser, uid: authUser.uid, schoolId: null, isParent: false, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
                setIsDirector(false);
            }
        } catch (err) {
            console.error("Error processing user state:", err);
            setUser(null);
            setIsDirector(false);
        } finally {
            setLoading(false);
        }
      }, (error) => {
          console.error("Snapshot error on user document:", error);
          setUser(null);
          setIsDirector(false);
          setLoading(false);
      });
      
      return () => unsubUserDoc();
    });

    return () => unsubscribe();
  }, [auth, firestore, isClient]);
  
  const schoolId = user?.schoolId;

  return {user, loading, isDirector, reloadUser, schoolId };
}
