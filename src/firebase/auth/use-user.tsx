
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth} from '../provider';
import type { staff as AppUser } from '@/lib/data-types';

// Simplified User interface. The school data logic is now in useSchoolData.
export interface User extends FirebaseUser {
    customClaims?: {
        [key: string]: any;
    }
    profile?: AppUser; // Profile might still be useful for display name, role etc.
}

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
        setUser(null);
        setLoading(false);
        return;
    }
    
    const unsubscribe = onIdTokenChanged(auth, async (authUser) => {
        if (authUser) {
            // This is now simpler. We just get the user and their claims.
            // The logic to fetch schoolId and profile is delegated.
            const tokenResult = await authUser.getIdTokenResult(true); // Force refresh
            setUser({
                ...authUser,
                customClaims: tokenResult.claims
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return {user, loading};
}

    