

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { onIdTokenChanged, getAuth } from 'firebase/auth';
import { useFirestore, useAuth } from '../firebase/client-provider';
import type { UserProfile, AppUser } from '@/lib/data-types';
import { useRouter } from 'next/navigation';
import { fetchUserAppData } from '@/services/user-service';

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const reloadUser = useCallback(async () => {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;
    if (currentUser) {
      // Force a refresh of the ID token, which will trigger onIdTokenChanged
      await currentUser.getIdToken(true);
    }
  }, []);

  useEffect(() => {
    if (!isClient || !auth || !firestore) {
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        const appUser = await fetchUserAppData(firestore, firebaseUser);
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isClient, firestore, auth, reloadUser, router]); // router added to deps

  const isDirector = user?.profile?.role === 'directeur';

  const setActiveSchool = async (schoolId: string) => {
    if (!user || user.isParent || !user.schools || !user.schools[schoolId]) {
      console.error("Action non autorisée ou école invalide.");
      return;
    }

    setLoading(true);
    const userRootRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userRootRef, { activeSchoolId: schoolId });
      await reloadUser();
      router.refresh();
    } catch (e) {
      console.error("Failed to set active school:", e);
    }
  };

  return {
    user,
    loading: loading || !isClient,
    hasSchool: !!user?.schoolId,
    schoolId: user?.schoolId,
    isDirector,
    setActiveSchool,
    reloadUser,
  };
}
