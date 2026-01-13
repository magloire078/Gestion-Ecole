
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
    if (user && !user.isParent && !hasSchool && !pathname.startsWith('/dashboard/onboarding')) {
      router.replace('/dashboard/onboarding');
      return;
    }

  }, [user, hasSchool, loading, router, pathname]);
  
  // Affiche un écran de chargement si...
  // 1. Les données de l'utilisateur ne sont pas encore chargées.
  if (loading) {
    return <LoadingScreen />;
  }

  // 2. L'utilisateur n'est pas connecté.
  if (!user) {
    return <LoadingScreen />;
  }
  
  // 3. L'utilisateur est connecté, n'a pas d'école et N'EST PAS sur la page d'onboarding
  // (ce qui signifie qu'une redirection est en cours)
  if (!user.isParent && !hasSchool && !pathname.startsWith('/dashboard/onboarding')) {
     return <LoadingScreen />;
  }
  
  // Si tout est en ordre, afficher les composants enfants.
  return <>{children}</>;
}
