'use client';

import { useAuthContext } from '@/contexts/auth-context';

export function useUser() {
  const auth = useAuthContext();
  
  return {
    user: auth.user ? { 
        ...auth.user, 
        profile: auth.userData, 
        uid: auth.user.uid,
        isParent: false, // This hook is for staff/admins
        schoolId: auth.schoolId,
        parentStudentIds: [],
    } : null,
    loading: auth.loading,
    isInitialized: auth.isInitialized,
    hasSchool: auth.hasSchool,
    schoolId: auth.schoolId,
    isDirector: auth.isDirector,
    reloadUser: auth.reloadUser,
    
    // For compatibility with your existing code
    authUser: auth.user,
    uid: auth.user?.uid,
    email: auth.user?.email,
    displayName: auth.user?.displayName,
    photoURL: auth.user?.photoURL,
    profile: auth.userData,
  };
}
