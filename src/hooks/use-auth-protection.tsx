
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const useAuthProtection = () => {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userLoading) {
            return; // Wait for user loading to finish
        }

        if (!user) {
            router.push('/login');
            return;
        }

        // Check if user has completed onboarding
        const userRootRef = doc(firestore, 'utilisateurs', user.uid);
        getDoc(userRootRef)
            .then((docSnap) => {
                if (docSnap.exists() && docSnap.data()?.schoolId) {
                    setIsLoading(false); // User is authenticated and onboarded
                } else {
                    router.push('/onboarding'); // User exists but hasn't onboarded
                }
            })
            .catch((error) => {
                console.error("Erreur lors de la vérification de l'onboarding:", error);
                router.push('/onboarding'); // Redirect to onboarding on error as a fallback
            });

    }, [user, userLoading, firestore, router]);

    const AuthProtectionLoader = () => (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="text-center">
                <p className="text-lg font-semibold">Chargement...</p>
                <p className="text-muted-foreground">Vérification de votre compte et de votre école.</p>
            </div>
        </div>
    );

    return { isLoading, AuthProtectionLoader };
};
