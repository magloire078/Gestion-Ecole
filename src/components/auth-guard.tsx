'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { LoadingScreen } from './ui/loading-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hasSchool, loading } = useUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Ne rien faire tant qu'on n'est pas sur le client ou que l'authentification charge
    if (!isClient || loading) {
      return; 
    }

    // Si le chargement est terminé et qu'il n'y a pas d'utilisateur, rediriger vers la connexion
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    
    // Si l'utilisateur est connecté mais n'a pas d'école, rediriger vers l'onboarding
    if (user && !hasSchool) {
      router.replace('/onboarding');
      return;
    }
  }, [isClient, user, hasSchool, loading, router]);
  
  // Affiche un loader pendant que la vérification initiale se fait côté client
  if (!isClient || loading) {
    return <LoadingScreen />;
  }

  // Affiche un loader pendant que la redirection s'effectue pour éviter les flashs de contenu.
  if (!user || !hasSchool) {
    return <LoadingScreen />;
  }
  
  // Si tout est bon, affiche le contenu protégé
  return <>{children}</>;
}
