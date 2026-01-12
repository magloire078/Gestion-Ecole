'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, onIdTokenChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, DocumentData } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { UserProfile } from '@/lib/data-types';
import { allPermissions } from '@/lib/permissions';

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  isParentSession: boolean;
  parentStudentIds: string[];
  loading: boolean;
  isInitialized: boolean;
  hasSchool: boolean;
  schoolId?: string;
  isDirector: boolean;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useFirebaseAuth();
  const firestore = useFirestore();

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [isParentSession, setIsParentSession] = useState(false);
  const [parentStudentIds, setParentStudentIds] = useState<string[]>([]);
  const [parentSchoolId, setParentSchoolId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDirector, setIsDirector] = useState(false);

  const reloadUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
  }, [auth]);

  useEffect(() => {
    if (typeof window === 'undefined' || !auth || !firestore) {
      return;
    }
    
    // Check for parent session in localStorage first
    try {
        const sessionId = localStorage.getItem('parent_session_id');
        const sessionSchoolId = localStorage.getItem('parent_school_id');
        const studentIdsStr = localStorage.getItem('parent_student_ids');

        if (sessionId && sessionSchoolId && studentIdsStr) {
            setIsParentSession(true);
            setParentStudentIds(JSON.parse(studentIdsStr));
            setParentSchoolId(sessionSchoolId);
            setLoading(false);
            setIsInitialized(true);
            return; // Stop further auth checks if it's a parent session
        }
    } catch(e) {
        console.error("Error reading parent session from localStorage", e);
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const isSuperAdmin = !!tokenResult.claims.superAdmin;

        const userRootRef = doc(firestore, 'users', firebaseUser.uid);
        const userRootSnap = await getDoc(userRootRef);
        const schoolId = userRootSnap.exists() ? userRootSnap.data().schoolId : null;
        
        let profile: UserProfile | null = null;
        let isDirectorFlag = false;

        if (isSuperAdmin) {
            profile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                schoolId: schoolId,
                role: 'super_admin' as any,
                firstName: 'Super',
                lastName: 'Admin',
                displayName: 'Super Admin',
                permissions: { ...allPermissions },
                isAdmin: true,
                hireDate: '',
                baseSalary: 0,
            };
        } else if (schoolId) {
            const profileRef = doc(firestore, `ecoles/${schoolId}/personnel`, firebaseUser.uid);
            const schoolDocRef = doc(firestore, 'ecoles', schoolId);
            
            const [profileSnap, schoolSnap] = await Promise.all([getDoc(profileRef), getDoc(schoolDocRef)]);
            
            const profileData = profileSnap.exists() ? profileSnap.data() as UserProfile : null;
            isDirectorFlag = schoolSnap.exists() && schoolSnap.data().directorId === firebaseUser.uid;
            
            if (profileData) {
                let permissions = {};
                if (isDirectorFlag) {
                    permissions = { ...allPermissions };
                } else if (profileData.adminRole) {
                    const roleRef = doc(firestore, `ecoles/${schoolId}/admin_roles`, profileData.adminRole);
                    const roleSnap = await getDoc(roleRef);
                    permissions = roleSnap.exists() ? roleSnap.data().permissions || {} : {};
                }
                profile = { ...profileData, permissions, isAdmin: false };
            }
        }
        
        setUserData(profile);
        setIsDirector(isDirectorFlag);

      } else {
        setUserData(null);
        setIsDirector(false);
      }

      setLoading(false);
      if (!isInitialized) {
        setIsInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, isInitialized, reloadUser]);

  const value: AuthContextType = {
    user,
    userData,
    isParentSession,
    parentStudentIds,
    loading,
    isInitialized,
    hasSchool: !!userData?.schoolId || !!parentSchoolId,
    schoolId: userData?.schoolId || parentSchoolId || undefined,
    isDirector,
    reloadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
