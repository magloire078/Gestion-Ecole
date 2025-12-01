
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export const useAuthProtection = () => {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userLoading) {
            return; // Wait for user loading to finish
        }

        if (!user) {
            router.push('/login');
        } else {
            // This is where you might check for onboarding status if needed
            // For now, if there's a user, we assume they are authenticated.
            setIsLoading(false);
        }
    }, [user, userLoading, router]);

    const AuthProtectionLoader = () => (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="text-center">
                <p className="text-lg font-semibold">Chargement...</p>
                <p className="text-muted-foreground">Vérification de l'authentification.</p>
            </div>
        </div>
    );


    return { isLoading, AuthProtectionLoader };
};
