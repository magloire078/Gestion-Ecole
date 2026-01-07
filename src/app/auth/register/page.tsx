
'use client';
import { redirect } from 'next/navigation';

export default function DeprecatedRegisterPage() {
    // Redirige vers la nouvelle page d'accueil qui gère l'inscription
    useEffect(() => {
        redirect('/');
    }, []);

    return null;
}
