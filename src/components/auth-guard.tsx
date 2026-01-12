
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { LoadingScreen } from './ui/loading-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hasSchool, loading } = useUser();

  useEffect(() => {
    // Ne rien faire tant que l'état de l'utilisateur n'est pas définitivement connu.
    if (loading) {
      return; 
    }

    // Si l'utilisateur n'est pas connecté, le rediriger vers la page de connexion.
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    
    // Si l'utilisateur est connecté mais n'est pas un parent et n'a pas d'école,
    // le rediriger vers le processus d'onboarding.
    if (user && !user.isParent && !hasSchool) {
      router.replace('/onboarding');
      return;
    }

  }, [user, hasSchool, loading, router]);
  
  // Affiche un écran de chargement tant que l'état n'est pas résolu
  // ou si une redirection est en cours.
  if (loading || !user || (!user.isParent && !hasSchool)) {
    return <LoadingScreen />;
  }
  
  // Si tout est en ordre, afficher les composants enfants.
  return <>{children}</>;
}
