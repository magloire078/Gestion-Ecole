'use client';

import { useAuthContext } from '@/contexts/auth-context';
import type { User as FirebaseUser } from 'firebase/auth';

// This is a simplified user object for consistent use across the app
export interface AppUser {
    uid: string;
    isParent: boolean;
    authUser?: FirebaseUser;
    profile?: any; // Consider creating a specific UserProfile type
    parentStudentIds?: string[];
    schoolId?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    email?: string | null;
}

export function useUser() {
  const authContext = useAuthContext();
  
  if (authContext.isParentSession) {
    return {
      user: {
        uid: localStorage.getItem('parent_session_id') || 'parent_session',
        isParent: true,
        schoolId: authContext.schoolId,
        parentStudentIds: authContext.parentStudentIds,
        displayName: 'Parent / Tuteur',
      },
      loading: authContext.loading,
      hasSchool: authContext.hasSchool,
      schoolId: authContext.schoolId,
      isDirector: false,
      reloadUser: async () => {},
    };
  }

  return {
    user: authContext.user ? {
        uid: authContext.user.uid,
        isParent: false,
        authUser: authContext.user,
        profile: authContext.userData,
        schoolId: authContext.schoolId,
        displayName: authContext.userData?.displayName || authContext.user.displayName,
        photoURL: authContext.userData?.photoURL || authContext.user.photoURL,
        email: authContext.user.email,
    } : null,
    loading: authContext.loading,
    hasSchool: authContext.hasSchool,
    schoolId: authContext.schoolId,
    isDirector: authContext.isDirector,
    reloadUser: authContext.reloadUser,
  };
}
