
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const searchParams = useSearchParams();
  const [justCreatedSchool, setJustCreatedSchool] = useState(false);

  useEffect(() => {
    // Vérifier si on vient juste de créer une école
    const fromOnboarding = searchParams.get('fromOnboarding');
    if (fromOnboarding === 'true') {
      setJustCreatedSchool(true);
      // Nettoyer le paramètre d'URL
      const newUrl = window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading) {
      return;
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
    
    // Cas spécial : on vient juste de créer une école
    if (justCreatedSchool) {
      if (pathname !== '/dashboard') { // Eviter une redirection en boucle si on y est déjà
        router.replace('/dashboard');
      }
      setJustCreatedSchool(false); // Réinitialiser après la redirection
      return;
    }

    // Si l'utilisateur est connecté mais n'a pas d'école (et n'est pas super admin)
    if (!schoolId && user.profile?.role !== 'super_admin') {
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

  }, [user, schoolId, loading, pathname, router, justCreatedSchool]);
  
  const isAuthPage = pathname === '/login';
  const isPublicPage = isAuthPage || pathname === '/' || pathname.startsWith('/public') || pathname === '/contact';
  const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

  // Afficher un loader pour toutes les pages protégées pendant la vérification initiale
  if (loading && !isPublicPage) {
      return <AuthProtectionLoader />;
  }

  // Si l'utilisateur est connecté mais que son statut d'école n'est pas encore clair,
  // et qu'on n'est pas sur une page publique, on affiche le loader pour éviter les flashs.
  if (user && schoolId === null && !isOnboardingPage && user.profile?.role !== 'super_admin' && !isPublicPage && !justCreatedSchool) {
      return <AuthProtectionLoader />;
  }

  // Si l'utilisateur est non authentifié mais tente d'accéder à une page protégée, on affiche le loader le temps de la redirection.
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
