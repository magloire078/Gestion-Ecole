
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import { doc, onSnapshot } from 'firebase/firestore';
import type { staff as AppUser } from '@/lib/data-types';

// Combine Firebase User with our app-specific user profile data
export interface User extends FirebaseUser {
    profile?: AppUser;
    customClaims?: {
        schoolId?: string;
        role?: 'admin' | 'directeur' | 'enseignant' | 'personnel';
        [key: string]: any;
    }
}

export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
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
            const tokenResult = await authUser.getIdTokenResult();
            const schoolId = tokenResult.claims.schoolId as string | undefined;

            const userWithClaims: User = {
                ...authUser,
                customClaims: tokenResult.claims
            };
            
            // Set user with claims immediately for faster UI response
            setUser(userWithClaims); 

            if (schoolId) {
                // If user is part of a school, fetch their profile from the school's subcollection
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel/${authUser.uid}`);
                const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUser(prevUser => prevUser ? { ...prevUser, profile: docSnap.data() as AppUser } : null);
                    } else {
                        setUser(prevUser => prevUser ? { ...prevUser, profile: undefined } : null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile:", error);
                    setLoading(false);
                });
                return () => unsubscribeProfile();
            } else {
                // User is authenticated but not associated with a school yet (e.g., during onboarding)
                setLoading(false);
            }
            
        } else {
            setUser(null);
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return {user, loading};
}

    