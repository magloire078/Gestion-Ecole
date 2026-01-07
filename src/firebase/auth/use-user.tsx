
'use client';

import {useState, useEffect, useCallback} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import type { staff as AppUser, admin_role as AdminRole, school as School, user_root } from '@/lib/data-types';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

export interface UserProfile extends AppUser {
    permissions?: Partial<AdminRole['permissions']>;
    isAdmin?: boolean;
}

export interface CombinedUser {
    uid: string;
    authUser?: FirebaseUser;
    profile?: UserProfile;
    isParent?: boolean;
    parentStudentIds?: string[];
    schoolId?: string;
    displayName?: string;
    photoURL?: string;
    email?: string;
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

  const reloadUser = useCallback(async () => {
    const firebaseUser = auth?.currentUser;
    if (firebaseUser) {
        setLoading(true);
        await firebaseUser.getIdToken(true); // Force refresh
        const userRootRef = doc(firestore, 'utilisateurs', firebaseUser.uid);
        const userRootSnap = await getDoc(userRootRef);

        if (userRootSnap.exists()) {
             const { schoolId } = userRootSnap.data();
             const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, firebaseUser.uid);
             const profileSnap = await getDoc(profileRef);
             const profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;
             
             let permissions = {};
             const isDirectorFlag = (await getDoc(doc(firestore, 'ecoles', schoolId))).data()?.directorId === firebaseUser.uid;
             if (isDirectorFlag) {
                 permissions = allPermissions;
             } else if (profileData?.adminRole) {
                 const roleSnap = await getDoc(doc(firestore, `ecoles/${schoolId}/admin_roles/${profileData.adminRole}`));
                 permissions = roleSnap.exists() ? roleSnap.data().permissions || {} : {};
             }

             setUser({ authUser: firebaseUser, uid: firebaseUser.uid, schoolId, profile: { ...profileData, permissions, isAdmin: false } as UserProfile, displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, email: firebaseUser.email });
             setIsDirector(isDirectorFlag);
        } else {
            setUser({ authUser: firebaseUser, uid: firebaseUser.uid, schoolId: undefined, profile: undefined, displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL, email: firebaseUser.email });
            setIsDirector(false);
        }
        setLoading(false);
    }
  }, [auth, firestore]);

  useEffect(() => {
    if (typeof window === 'undefined') {
        return;
    }
    
    // Check for parent session only on client
    try {
        const sessionId = localStorage.getItem('parent_session_id');
        const sessionSchoolId = localStorage.getItem('parent_school_id');
        const studentIdsStr = localStorage.getItem('parent_student_ids');

        if (sessionId && sessionSchoolId && studentIdsStr) {
            setUser({
                uid: sessionId,
                schoolId: sessionSchoolId,
                isParent: true,
                parentStudentIds: JSON.parse(studentIdsStr),
                displayName: 'Parent / Tuteur',
            });
            setLoading(false);
            return;
        }
    } catch (e) {
      console.error("Failed to read parent session from local storage", e);
    }
    
    if (!auth || !firestore) {
      setLoading(false);
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
      const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);

      // Using onSnapshot to listen for real-time changes (e.g., schoolId assignment)
      const unsubUserDoc = onSnapshot(userRootRef, async (userRootSnap) => {
        try {
            const tokenResult = await authUser.getIdTokenResult(true);
            const isSuperAdmin = !!tokenResult.claims.superAdmin;
            
            if (isSuperAdmin) {
                const superAdminProfile: UserProfile = {
                    uid: authUser.uid, email: authUser.email || '', schoolId: userRootSnap.data()?.schoolId || '',
                    role: 'super_admin' as any, firstName: 'Super', lastName: 'Admin',
                    hireDate: '', baseSalary: 0, displayName: 'Super Admin',
                    permissions: { ...allPermissions }, isAdmin: true,
                };
                setUser({ authUser, uid: authUser.uid, profile: superAdminProfile, schoolId: userRootSnap.data()?.schoolId, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
                setIsDirector(false);
            } else if (userRootSnap.exists()) {
                const { schoolId } = userRootSnap.data();
                if (schoolId) {
                    const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, authUser.uid);
                    const schoolDocRef = doc(firestore, 'ecoles', schoolId);
                    
                    const [profileSnap, schoolSnap] = await Promise.all([getDoc(profileRef), getDoc(schoolDocRef)]);
                    
                    const profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;
                    const isDirectorFlag = schoolSnap.exists() && schoolSnap.data().directorId === authUser.uid;
                    setIsDirector(isDirectorFlag);
                    
                    let permissions: Partial<AdminRole['permissions']> = {};
                    if (isDirectorFlag) {
                        permissions = { ...allPermissions };
                    } else if (profileData?.adminRole) {
                        const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, profileData.adminRole);
                        const roleSnap = await getDoc(roleRef);
                        permissions = roleSnap.exists() ? roleSnap.data().permissions || {} : {};
                    }

                    setUser({ authUser, uid: authUser.uid, schoolId: schoolId, profile: { ...profileData, permissions, isAdmin: false } as UserProfile, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
                } else {
                    // User exists but no schoolId (onboarding needed)
                    setUser({ authUser, uid: authUser.uid, profile: undefined, schoolId: undefined, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
                    setIsDirector(false);
                }
            } else {
                // No user root document, user needs onboarding
                setUser({ authUser, uid: authUser.uid, profile: undefined, schoolId: undefined, displayName: authUser.displayName, photoURL: authUser.photoURL, email: authUser.email });
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
  }, [auth, firestore]);

  return {user, loading, isDirector, reloadUser, schoolId: user?.schoolId};
}
