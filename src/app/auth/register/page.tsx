
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// Cette page est dépréciée. L'inscription se fait via l'onboarding après une première connexion.
// On redirige les utilisateurs vers la page de connexion pour unifier le point d'entrée.
export default function DeprecatedRegisterPage() {
    useEffect(() => {
        redirect('/auth/login');
    }, []);

    return null;
}
