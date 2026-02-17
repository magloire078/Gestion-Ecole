'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { onIdTokenChanged, getAuth, User as FirebaseUser } from 'firebase/auth';
import { useFirestore, useAuth } from '@/firebase';
import { AppUser } from '@/lib/data-types';
import { fetchUserAppData } from '@/services/user-service';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';

interface UserContextType {
    user: AppUser | null;
    loading: boolean;
    hasSchool: boolean;
    schoolId: string | null | undefined;
    isDirector: boolean;
    reloadUser: () => Promise<void>;
    setActiveSchool: (schoolId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const firestore = useFirestore();
    const auth = useAuth();
    const router = useRouter();

    const reloadUser = useCallback(async () => {
        if (!auth?.currentUser || !firestore) {
            console.warn("[UserProvider] Cannot reload: auth or firestore missing");
            return;
        }

        console.log("[UserProvider] Reloading user data...");
        const start = performance.now();
        setLoading(true);
        try {
            // Force refresh token and fetch fresh app data
            await auth.currentUser.getIdToken(true);
            const appUser = await fetchUserAppData(firestore, auth.currentUser);
            setUser(appUser);
            const end = performance.now();
            console.log(`[UserProvider] User data reloaded in ${(end - start).toFixed(2)}ms`);
        } catch (error) {
            console.error("[UserProvider] Error during reloadUser:", error);
        } finally {
            setLoading(false);
        }
    }, [auth, firestore]);

    useEffect(() => {
        if (!auth || !firestore) {
            console.warn("[UserProvider] Auth or Firestore instance missing");
            return;
        }

        console.log("[UserProvider] Setting up auth observer...");

        // Sécurité : si au bout de 8 secondes on est toujours en chargement, on libère l'interface
        // même si Firebase n'a pas répondu (pour éviter le blocage infini)
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.warn("[UserProvider] Initial loading timed out after 8s");
                setLoading(false);
            }
        }, 8000);

        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            console.log("[UserProvider] Auth state changed, user:", firebaseUser?.uid || 'NONE');
            const start = performance.now();
            setLoading(true);
            try {
                if (firebaseUser) {
                    const appUser = await fetchUserAppData(firestore, firebaseUser);
                    const end = performance.now();
                    console.log(`[UserProvider] App data fetched for ${appUser?.uid} in ${(end - start).toFixed(2)}ms`);
                    setUser(appUser);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("[UserProvider] Error in auth observer:", error);
                setUser(null);
            } finally {
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        });

        return () => {
            unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, [auth, firestore]);

    const setActiveSchool = useCallback(async (schoolId: string) => {
        if (!auth?.currentUser || !firestore) return;
        try {
            setLoading(true);
            const userRef = doc(firestore, `users/${auth.currentUser.uid}`);
            await updateDoc(userRef, { activeSchoolId: schoolId });
            await reloadUser();
        } catch (error) {
            console.error("Error switching school:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [auth, firestore, reloadUser]);

    const value = {
        user,
        loading,
        hasSchool: !!user?.schoolId,
        schoolId: user?.schoolId,
        isDirector: user?.profile?.role === 'directeur',
        reloadUser,
        setActiveSchool,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
