
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { LoadingScreen } from './ui/loading-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    
    // Si l'utilisateur est connecté mais n'est pas un parent, n'a pas d'école
    // ET n'est pas déjà sur la page d'onboarding, le rediriger.
    if (user && !user.isParent && !hasSchool && pathname !== '/dashboard/onboarding') {
      router.replace('/dashboard/onboarding');
      return;
    }

  }, [user, hasSchool, loading, router, pathname]);
  
  // Affiche un écran de chargement tant que l'état n'est pas résolu
  // ou si une redirection est en cours (sauf si on est sur la page d'onboarding elle-même).
  if (loading || !user || (!user.isParent && !hasSchool && pathname !== '/dashboard/onboarding')) {
    return <LoadingScreen />;
  }
  
  // Si tout est en ordre, afficher les composants enfants.
  return <>{children}</>;
}
