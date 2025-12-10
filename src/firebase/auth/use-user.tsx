
'use client';

import {useState, useEffect} from 'react';
import {onIdTokenChanged, type User as FirebaseUser} from 'firebase/auth';
import {useAuth, useFirestore} from '../provider';
import { doc, onSnapshot } from 'firebase/firestore';
import type { user as AppUser } from '@/lib/data-types';

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
            const schoolId = tokenResult.claims.schoolId;

            // Create the initial user object with auth data and claims
            const userWithClaims: User = {
                ...authUser,
                customClaims: tokenResult.claims
            };
            setUser(userWithClaims); // Set user early for faster UI response

            // If user has a school, fetch their detailed profile from the school's subcollection
            if (schoolId) {
                const profileRef = doc(firestore, `ecoles/${schoolId}/utilisateurs/${authUser.uid}`);
                const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
                    if (docSnap.exists()) {
                        // Merge the profile into the existing user object
                        setUser(prevUser => prevUser ? { ...prevUser, profile: docSnap.data() as AppUser } : null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user profile:", error);
                    setLoading(false);
                });
                return () => unsubscribeProfile(); // Cleanup profile listener
            } else {
                setLoading(false); // No school, so we're done loading
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
