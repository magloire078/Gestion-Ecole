
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
        setLoading(true); // Set loading to true whenever the user state might change
        if (authUser) {
            try {
                const tokenResult = await authUser.getIdTokenResult(); // Use cached token if available
                const schoolId = tokenResult.claims.schoolId as string | undefined;

                const userWithClaims: User = {
                    ...authUser,
                    customClaims: tokenResult.claims
                };
                
                // Fetch profile only if we have a schoolId from claims.
                // The useSchoolData hook will handle the fallback logic.
                if (schoolId) {
                    const profileRef = doc(firestore, `ecoles/${schoolId}/personnel/${authUser.uid}`);
                    onSnapshot(profileRef, (docSnap) => {
                        const profileData = docSnap.exists() ? docSnap.data() as AppUser : undefined;
                        setUser({ ...userWithClaims, profile: profileData });
                        setLoading(false);
                    }, (error) => {
                        console.error("Error fetching user profile:", error);
                        setUser(userWithClaims); // Keep user data even if profile fails
                        setLoading(false);
                    });
                } else {
                    // No schoolId in claims, let useSchoolData figure it out.
                    setUser(userWithClaims);
                    setLoading(false);
                }
            } catch (error) {
                 console.error("Error getting id token result:", error);
                 setUser(authUser); // Keep the basic auth user even if token claims fail
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
