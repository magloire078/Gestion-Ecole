

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
  const [schoolId, setSchoolId] = useState<string | null | undefined>(undefined);
  const [isDirector, setIsDirector] = useState(false);

  const checkParentSession = useCallback(() => {
    try {
        const sessionId = localStorage.getItem('parent_session_id');
        const sessionSchoolId = localStorage.getItem('parent_school_id');
        const studentIdsStr = localStorage.getItem('parent_student_ids');

        if (sessionId && sessionSchoolId && studentIdsStr) {
            setSchoolId(sessionSchoolId);
            setUser({
                uid: sessionId,
                schoolId: sessionSchoolId,
                isParent: true,
                parentStudentIds: JSON.parse(studentIdsStr),
            });
            setLoading(false);
            return true;
        }
    } catch (e) {
        console.error("Error accessing parent session from localStorage:", e);
    }
    return false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
        setLoading(false);
        return;
    }
    
    // Si une session parent est trouvée, on ne cherche pas d'utilisateur Firebase.
    if (checkParentSession()) {
        return;
    }
    
    if (!auth || !firestore) {
      setLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (authUser) => {
      if (!authUser) {
        // Avant de conclure qu'il n'y a pas d'utilisateur, revérifier la session parent.
        if (!checkParentSession()) {
          setUser(null);
          setSchoolId(null);
          setIsDirector(false);
          setLoading(false);
        }
        return;
      }
      
      setLoading(true);

      try {
        const userRootRef = doc(firestore, 'utilisateurs', authUser.uid);
        const userRootSnap = await getDoc(userRootRef);

        const effectiveSchoolId = userRootSnap.exists() ? userRootSnap.data().schoolId : null;
        setSchoolId(effectiveSchoolId);
        
        const tokenResult = await authUser.getIdTokenResult(true);
        const isSuperAdmin = (tokenResult.claims.superAdmin as boolean) === true;

        if (isSuperAdmin) {
            const superAdminProfile: UserProfile = {
                uid: authUser.uid, email: authUser.email || '', schoolId: effectiveSchoolId || '',
                role: 'super_admin' as any, firstName: 'Super', lastName: 'Admin',
                hireDate: '', baseSalary: 0, displayName: 'Super Admin',
                permissions: { ...allPermissions }, isAdmin: true,
            };
             setUser({ authUser, uid: authUser.uid, profile: superAdminProfile });
             setIsDirector(false);
        } else if (effectiveSchoolId) {
            const profileRef = doc(firestore, `ecoles/${effectiveSchoolId}/personnel`, authUser.uid);
            const schoolDocRef = doc(firestore, 'ecoles', effectiveSchoolId);
            
            const [profileSnap, schoolSnap] = await Promise.all([
                getDoc(profileRef),
                getDoc(schoolDocRef)
            ]);

            const profileData = profileSnap.exists() ? profileSnap.data() as AppUser : null;
            const isDirectorFlag = schoolSnap.exists() && schoolSnap.data().directorId === authUser.uid;
            setIsDirector(isDirectorFlag);
            
            if (profileData) {
                let permissions: Partial<AdminRole['permissions']> = {};
                if (isDirectorFlag) {
                    permissions = { ...allPermissions };
                } else if (profileData.adminRole) {
                    const roleRef = doc(firestore, `ecoles/${effectiveSchoolId}/admin_roles`, profileData.adminRole);
                    const roleSnap = await getDoc(roleRef);
                    if (roleSnap.exists()) {
                        permissions = roleSnap.data().permissions || {};
                    }
                }
                setUser({ authUser, uid: authUser.uid, schoolId: effectiveSchoolId, profile: { ...profileData, permissions, isAdmin: false } });
            } else {
                 setUser({ authUser, uid: authUser.uid, schoolId: effectiveSchoolId, profile: undefined });
            }

        } else {
            setUser({ authUser, uid: authUser.uid, profile: undefined });
            setIsDirector(false);
        }
      } catch (error) {
        console.error("Erreur dans useUser:", error);
        setUser({ authUser, uid: authUser.uid, profile: undefined });
        setSchoolId(null);
        setIsDirector(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, checkParentSession]);

  return {user, loading, schoolId, isDirector};
}
