'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User} from 'firebase/auth';
import {useAuth} from '../provider';

// Extend the User interface to include custom claims if they exist
interface UserWithClaims extends User {
    customClaims?: {
        schoolId?: string;
        [key: string]: any;
    }
}

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<UserWithClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
        if(user) {
            const tokenResult = await user.getIdTokenResult();
            const userWithClaims: UserWithClaims = {
                ...user,
                customClaims: tokenResult.claims
            };
            setUser(userWithClaims);
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return {user, loading};
}

    