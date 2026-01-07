
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="text-lg font-semibold">Chargement de votre session...</p>
        <p className="text-muted-foreground">Veuillez patienter.</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  
  const publicPages = ['/auth/login', '/auth/register', '/auth/forgot-password', '/contact', '/survey', '/parent-access', '/terms', '/privacy'];
  const isPublicPage = publicPages.some(p => pathname.startsWith(p)) || pathname === '/';
  const isOnboardingPage = pathname.startsWith('/onboarding');

  useEffect(() => {
    // Ne faites rien tant que le statut de l'utilisateur n'est pas déterminé
    if (loading) {
      return; 
    }
    
    // Si l'utilisateur n'est pas connecté et n'est pas sur une page publique, redirigez-le vers la page de connexion.
    if (!user && !isPublicPage) {
      router.replace('/auth/login');
      return;
    }
    
    // Si l'utilisateur est connecté :
    if (user) {
      // S'il est sur une page publique (comme /login), redirigez-le.
      if (isPublicPage) {
        router.replace('/dashboard');
        return;
      }
      
      const hasSchool = !!user.schoolId;

      // S'il a une école mais est sur une page d'onboarding, redirigez-le au dashboard.
      if (hasSchool && isOnboardingPage) {
        router.replace('/dashboard');
        return;
      }
      
      // S'il n'a pas d'école mais tente d'accéder au dashboard (et n'est pas déjà sur l'onboarding),
      // redirigez-le vers la page d'onboarding.
      if (!hasSchool && !isOnboardingPage && pathname.startsWith('/dashboard')) {
        router.replace('/onboarding');
        return;
      }
    }
    
  }, [user, loading, pathname, isPublicPage, isOnboardingPage, router]);

  // Affichez un loader tant que la vérification est en cours ET que ce n'est pas une page publique
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Affichez un loader si l'utilisateur est connecté mais n'a pas d'école, le temps que la redirection vers l'onboarding se fasse
  if (!loading && user && !user.schoolId && !isOnboardingPage && pathname.startsWith('/dashboard')) {
      return <AuthProtectionLoader />;
  }
  
  // Affichez un loader si l'utilisateur n'est pas connecté et n'est pas sur une page publique, pendant la redirection
  if (!loading && !user && !isPublicPage) {
      return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
