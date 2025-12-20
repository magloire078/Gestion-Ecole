
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
      return; // Attendre que l'état d'authentification soit résolu
    }

    const isAuthPage = pathname === '/login';
    const isPublicPage = isAuthPage || pathname === '/' || pathname.startsWith('/public') || pathname === '/contact';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

    // Cas 1: Pas d'utilisateur connecté
    if (!user) {
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }

    // Cas 2: Utilisateur connecté
    if (isAuthPage) {
      router.replace('/dashboard');
      return;
    }
    
    const isSuperAdmin = user.profile?.isAdmin === true;

    // Cas 3: Utilisateur connecté sans école (et non super admin)
    if (!schoolId && !isSuperAdmin) {
      if (!isOnboardingPage) {
        router.replace('/dashboard/onboarding');
      }
      return;
    }

    // Cas 4: Utilisateur avec une école, mais sur la page d'onboarding
    if (schoolId && isOnboardingPage) {
      router.replace('/dashboard');
      return;
    }
    
  }, [user, schoolId, loading, pathname, router]);

  // Si on charge encore les infos de l'utilisateur, on affiche un loader
  if (loading) {
    return <AuthProtectionLoader />;
  }

  // Si l'utilisateur est connecté mais que son ID d'école n'est pas encore chargé (état de transition)
  // on affiche un loader pour éviter le "flash" vers la page d'onboarding.
  if (user && !schoolId && !pathname.startsWith('/dashboard/onboarding') && !user.profile?.isAdmin) {
    return <AuthProtectionLoader />;
  }

  // L'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
  if (!user && pathname !== '/login' && pathname !== '/' && !pathname.startsWith('/public') && pathname !== '/contact') {
      return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
