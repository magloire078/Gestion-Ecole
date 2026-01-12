'use client';

import { useAuthContext } from '@/contexts/auth-context';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '@/lib/data-types';
import { useEffect, useState } from 'react';


export interface AppUser {
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

export function useUser() {
  const authContext = useAuthContext();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return {
      user: null,
      loading: true,
      isDirector: false,
      schoolId: undefined,
      hasSchool: false,
      reloadUser: async () => {},
    };
  }
  
  if (authContext.isParentSession) {
    return {
      user: {
        uid: localStorage.getItem('parent_session_id') || 'parent_session',
        isParent: true,
        schoolId: authContext.schoolId,
        parentStudentIds: authContext.parentStudentIds,
        displayName: 'Parent / Tuteur',
        profile: undefined,
        authUser: undefined,
      } as AppUser,
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
        profile: authContext.userData || undefined,
        schoolId: authContext.schoolId,
        displayName: authContext.userData?.displayName || authContext.user.displayName,
        photoURL: authContext.userData?.photoURL || authContext.user.photoURL,
        email: authContext.user.email,
    } as AppUser : null,
    loading: authContext.loading,
    hasSchool: authContext.hasSchool,
    schoolId: authContext.schoolId,
    isDirector: authContext.isDirector,
    reloadUser: authContext.reloadUser,
  };
}
