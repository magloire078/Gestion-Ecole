
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
    if (loading) {
      return; 
    }

    if (!user) {
      router.replace('/auth/login');
      return;
    }
    
    // Si l'utilisateur est connecté mais n'a pas d'école ET qu'il n'est pas déjà sur la page d'onboarding,
    // on le redirige vers le bon flux d'onboarding.
    if (!user.isParent && !hasSchool && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding');
      return;
    }
    
  }, [user, hasSchool, loading, router, pathname]);
  
  if (loading) {
    return <LoadingScreen />;
  }

  // Si l'utilisateur n'est pas authentifié, on attend la redirection.
  if (!user) {
    return <LoadingScreen />;
  }
  
  // Si l'utilisateur n'est pas parent, n'a pas d'école et n'est pas dans le flux d'onboarding, on attend la redirection.
  if (!user.isParent && !hasSchool && !pathname.startsWith('/onboarding')) {
     return <LoadingScreen />;
  }
  
  return <>{children}</>;
}
