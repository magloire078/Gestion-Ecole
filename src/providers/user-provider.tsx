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
    loadingTimeout: boolean;
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
    const [loadingTimeout, setLoadingTimeout] = useState(false);
    const loadingRef = React.useRef(loading);
    
    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

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
        setLoadingTimeout(false);
        try {
            // Force refresh token and fetch fresh app data
            await auth.currentUser.getIdToken(true);
            const appUser = await fetchUserAppData(firestore, auth.currentUser);
            setUser(appUser);
            const end = performance.now();
            console.log(`[UserProvider] User data reloaded in ${(end - start).toFixed(2)}ms`, appUser ? "SUCCESS" : "EMPTY");
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

        // Sécurité : si au bout de 12 secondes on est toujours en chargement, on signale un timeout
        const timeoutDuration = 12000;
        let safetyTimeout: NodeJS.Timeout;

        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            console.log("[UserProvider] Auth state changed, user:", firebaseUser?.uid || 'NONE');
            const start = performance.now();
            setLoading(true);
            setLoadingTimeout(false);

            if (safetyTimeout) clearTimeout(safetyTimeout);
            safetyTimeout = setTimeout(() => {
                if (loadingRef.current) {
                    console.warn("[UserProvider] Initial loading timed out - possible network issue (QUIC/Firewall)");
                    setLoadingTimeout(true);
                }
            }, timeoutDuration);

            try {
                if (firebaseUser) {
                    console.log("[UserProvider] Fetching app data for authenticated user...");
                    try {
                        const appUser = await fetchUserAppData(firestore, firebaseUser);
                        const end = performance.now();
                        console.log(`[UserProvider] App data fetch completed for ${appUser?.uid} in ${(end - start).toFixed(2)}ms`, appUser ? "SUCCESS" : "FAILED/NULL");
                        setUser(appUser);
                    } catch (fetchError: any) {
                        const isNetworkError = fetchError.code === 'unavailable' || fetchError.message?.includes('offline');
                        console.error("[UserProvider] CRITICAL: fetchUserAppData failed!", {
                            message: fetchError.message,
                            code: fetchError.code,
                            isNetworkError,
                            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'
                        });
                        setUser(null);
                    }
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("[UserProvider] Error in auth observer:", error);
                setUser(null);
            } finally {
                setLoading(false);
                if (safetyTimeout) clearTimeout(safetyTimeout);
            }
        });

        return () => {
            unsubscribe();
            if (safetyTimeout) clearTimeout(safetyTimeout);
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
        loadingTimeout,
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
