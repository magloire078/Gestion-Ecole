
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
            try {
                const tokenResult = await authUser.getIdTokenResult(true); // Force refresh
                const schoolId = tokenResult.claims.schoolId as string | undefined;

                const userWithClaims: User = {
                    ...authUser,
                    customClaims: tokenResult.claims
                };
                
                setUser(userWithClaims); 

                if (schoolId) {
                    const profileRef = doc(firestore, `ecoles/${schoolId}/personnel/${authUser.uid}`);
                    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
                        if (docSnap.exists()) {
                            setUser(prevUser => prevUser ? { ...prevUser, profile: docSnap.data() as AppUser } : null);
                        } else {
                            // Le profil n'existe peut-être pas encore, mais c'est ok.
                            setUser(prevUser => prevUser ? { ...prevUser, profile: undefined } : null);
                        }
                        setLoading(false);
                    }, (error) => {
                        console.error("Error fetching user profile:", error);
                        setLoading(false);
                    });
                    // Retourner la fonction de désinscription pour le profil
                    return () => unsubscribeProfile();
                } else {
                    // Pas de schoolId, l'utilisateur n'est pas encore onboardé
                    setLoading(false);
                }
            } catch (error) {
                 console.error("Error getting id token result:", error);
                 setUser(authUser); // Garder l'utilisateur de base même si le token échoue
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
