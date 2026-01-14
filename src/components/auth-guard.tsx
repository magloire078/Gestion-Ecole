
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

    // Si l'utilisateur n'est pas authentifié, on le redirige vers la page de connexion
    // sauf s'il est déjà sur une page publique autorisée.
    const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/parent-access', '/', '/contact', '/survey'];
    if (!user && !publicPaths.some(p => pathname.startsWith(p))) {
      router.replace('/auth/login');
      return;
    }
    
    // Si l'utilisateur est connecté...
    if (user) {
        // S'il est sur une page d'authentification, on le redirige vers le dashboard
        if (pathname.startsWith('/auth')) {
             router.replace('/dashboard');
             return;
        }

        // Si l'utilisateur n'est pas un parent, n'a pas d'école et n'est pas déjà
        // dans le flux d'onboarding, on le redirige.
        if (!user.isParent && !hasSchool && !pathname.startsWith('/onboarding')) {
          router.replace('/onboarding');
          return;
        }
    }
    
  }, [user, hasSchool, loading, router, pathname]);
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page non publique,
  // on affiche un écran de chargement pendant la redirection.
  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/parent-access', '/', '/contact', '/survey'];
  if (!user && !publicPaths.some(p => pathname.startsWith(p))) {
    return <LoadingScreen />;
  }
  
  // Si l'utilisateur est connecté mais n'a pas encore de profil d'école et n'est pas sur la bonne page, on attend.
  if (user && !user.isParent && !hasSchool && !pathname.startsWith('/onboarding')) {
     return <LoadingScreen />;
  }
  
  return <>{children}</>;
}
