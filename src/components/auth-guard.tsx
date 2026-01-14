
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { LoadingScreen } from './ui/loading-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hasSchool, loading } = useUser();

  useEffect(() => {
    if (loading) {
      return; 
    }

    const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/parent-access', '/', '/contact', '/survey'];
    if (!user && !publicPaths.some(p => pathname.startsWith(p))) {
      router.replace('/auth/login');
      return;
    }
    
    if (user) {
        if (pathname.startsWith('/auth')) {
             router.replace('/dashboard');
             return;
        }

        // Si l'utilisateur n'a pas d'école et n'est pas DÉJÀ dans le flux d'onboarding, on redirige.
        // Cela empêche la redirection intempestive depuis la page de création.
        if (!user.isParent && !hasSchool && !pathname.startsWith('/onboarding')) {
          router.replace('/onboarding');
          return;
        }
    }
    
  }, [user, hasSchool, loading, router, pathname]);
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/parent-access', '/', '/contact', '/survey'];
  if (!user && !publicPaths.some(p => pathname.startsWith(p))) {
    return <LoadingScreen />;
  }
  
  if (user && !user.isParent && !hasSchool && !pathname.startsWith('/onboarding')) {
     return <LoadingScreen />;
  }
  
  return <>{children}</>;
}
