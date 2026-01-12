
'use client';

import { useAuthContext } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingScreen } from './ui/loading-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isParentSession, hasSchool, isInitialized, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Ne pas exécuter la logique de redirection tant que l'état d'auth n'est pas finalisé.
    if (!isInitialized || loading) {
      return; 
    }
    
    const isAuthFlow = pathname.startsWith('/auth') || pathname === '/parent-access';
    const isOnboarding = pathname.startsWith('/onboarding');
    const publicPages = ['/', '/contact', '/survey', '/terms', '/privacy'];
    
    // L'état est maintenant stable, on peut procéder aux redirections.
    if (user || isParentSession) {
      if (hasSchool) {
        if (isAuthFlow || isOnboarding) {
          router.replace('/dashboard');
        }
      } else if (!isParentSession) {
        if (!isOnboarding) {
          router.replace('/onboarding');
        }
      }
    } else {
      // Utilisateur non authentifié
      if (!isAuthFlow && !publicPages.includes(pathname)) {
        router.replace('/auth/login');
      }
    }

  }, [isInitialized, loading, user, isParentSession, hasSchool, pathname, router]);

  // Affiche un écran de chargement tant que l'initialisation n'est pas terminée.
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  // Si l'état est initialisé mais qu'on est sur une page protégée sans être connecté,
  // on peut afficher un loader pour masquer le contenu le temps que la redirection s'effectue.
  if (loading && !publicPages.includes(pathname) && !pathname.startsWith('/auth')) {
      return <LoadingScreen />;
  }

  return <>{children}</>;
}
