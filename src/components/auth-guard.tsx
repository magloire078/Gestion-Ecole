

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
  const { user, loading, schoolId } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  
  const isPublicPage = ['/', '/login', '/contact', '/survey'].includes(pathname) || pathname.startsWith('/public');
  const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

  useEffect(() => {
    // Si le chargement initial de l'utilisateur n'est pas terminé, ne rien faire
    if (loading) {
      return;
    }
    
    // Scénario 1: L'utilisateur n'est pas connecté
    if (!user) {
      // S'il n'est pas sur une page publique, rediriger vers la connexion
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }
    
    // Scénario 2: L'utilisateur est connecté mais sur une page publique
    if (isPublicPage) {
        // Le rediriger vers le tableau de bord
        router.replace('/dashboard');
        return;
    }
    
    // Scénario 3: Gestion de l'onboarding pour un utilisateur connecté
    // L'ID de l'école est 'undefined' pendant que useUser le charge. 'null' signifie "chargé et pas d'école".
    const isAssociatedWithSchool = schoolId !== null && schoolId !== undefined;
    const isSuperAdmin = user.profile?.isAdmin === true;

    if (!isAssociatedWithSchool && !isSuperAdmin) {
      // Si l'utilisateur n'est ni associé à une école ni super admin, il DOIT être sur l'onboarding
      if (!isOnboardingPage) {
        router.replace('/dashboard/onboarding');
      }
    } else {
      // Si l'utilisateur est associé à une école (ou est super admin), il ne doit PAS être sur l'onboarding
      if (isOnboardingPage) {
        router.replace('/dashboard');
      }
    }
    
  }, [user, schoolId, loading, pathname, isPublicPage, isOnboardingPage, router]);


  // Pendant le chargement initial, on affiche un loader si on n'est pas sur une page publique
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si on est connecté, mais que la redirection n'a pas encore eu lieu, on affiche le loader
  if (user && !isPublicPage) {
      const isAssociatedWithSchool = schoolId !== null && schoolId !== undefined;
      const isSuperAdmin = user.profile?.isAdmin === true;

      // On affiche le loader si on est sur l'onboarding mais qu'on devrait être ailleurs
      if (isOnboardingPage && (isAssociatedWithSchool || isSuperAdmin)) {
          return <AuthProtectionLoader />;
      }
      // Ou si on n'est pas sur l'onboarding mais qu'on devrait y être
      if (!isOnboardingPage && !isAssociatedWithSchool && !isSuperAdmin) {
          return <AuthProtectionLoader />;
      }
  }

  // Si pas d'utilisateur et page privée, on affiche le loader en attendant la redirection
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
