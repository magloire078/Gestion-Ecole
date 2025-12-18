
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-semibold">Chargement de votre espace...</p>
        <p className="text-muted-foreground">Vérification de vos accès.</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, schoolId, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return; // Ne rien faire tant que l'état d'authentification n'est pas résolu.
    }

    const isAuthPage = pathname === '/login';
    const isPublicPage = isAuthPage || pathname === '/' || pathname.startsWith('/public') || pathname === '/contact';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

    // Si l'utilisateur n'est pas connecté
    if (!user) {
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }

    // Si l'utilisateur est connecté
    if (isAuthPage) {
      router.replace('/dashboard');
      return;
    }
    
    // Si l'utilisateur est connecté mais n'a pas d'école
    if (!schoolId) {
      if (!isOnboardingPage) {
        router.replace('/dashboard/onboarding');
      }
      return;
    }

    // Si l'utilisateur est connecté, a une école, mais se trouve sur la page d'onboarding
    if (schoolId && isOnboardingPage) {
      router.replace('/dashboard');
      return;
    }

  }, [user, schoolId, loading, pathname, router]);
  
  // Affiche un loader uniquement pour les pages protégées pendant la vérification
  if (loading && !['/login', '/', '/contact'].includes(pathname) && !pathname.startsWith('/public')) {
      return <AuthProtectionLoader />;
  }

  // Si l'utilisateur est non-nul mais que schoolId est encore en cours de détermination,
  // et qu'on est sur une page protégée, on peut vouloir attendre.
  if (user && schoolId === undefined && !pathname.startsWith('/dashboard/onboarding')) {
      // Potentiellement afficher un loader ici aussi si on voit des flashs de contenu non désiré
  }

  return <>{children}</>;
}
