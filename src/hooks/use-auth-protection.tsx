
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
            return; // Attendre la fin du chargement de l'utilisateur
        }

        if (!user) {
            router.push('/login');
        } else {
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
