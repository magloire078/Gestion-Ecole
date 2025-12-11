
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

            // If user has a school, fetch their profile from the corresponding subcollection
            if (schoolId) {
                const profileRef = doc(firestore, `ecoles/${schoolId}/personnel/${authUser.uid}`);
                const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUser(prevUser => prevUser ? { ...prevUser, profile: docSnap.data() as AppUser } : null);
                    } else {
                         // This case might happen if the profile doc is not yet created.
                        setUser(prevUser => prevUser ? { ...prevUser, profile: undefined } : null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile from ecoles/{schoolId}/personnel:", error);
                    setLoading(false);
                });
                return () => unsubscribeProfile();
            } else {
                 // User is authenticated but has no school (e.g., during onboarding or super admin)
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
