
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
  
  const isPublicPage = ['/', '/login', '/contact'].includes(pathname) || pathname.startsWith('/public');
  const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

  useEffect(() => {
    if (loading) {
      return; // Attendre que le chargement soit terminé
    }
    
    // 1. Si l'utilisateur n'est pas connecté
    if (!user) {
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }
    
    // 2. Si l'utilisateur est connecté et sur une page publique
    if (isPublicPage) {
        router.replace('/dashboard');
        return;
    }
    
    // 3. Logique d'onboarding
    const isAssociatedWithSchool = !!schoolId;
    const isSuperAdmin = user.profile?.isAdmin === true;

    if (!isAssociatedWithSchool && !isSuperAdmin) {
      // Non associé et pas admin -> doit aller sur l'onboarding
      if (!isOnboardingPage) {
        router.replace('/dashboard/onboarding');
      }
    } else {
      // Associé à une école (ou super admin) -> ne doit PAS être sur l'onboarding
      if (isOnboardingPage) {
        router.replace('/dashboard');
      }
    }
    
  }, [user, schoolId, loading, pathname, isPublicPage, isOnboardingPage, router]);


  // Afficher un loader si on est sur une page privée et que les infos chargent
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si l'utilisateur est connecté mais que les redirections ne sont pas encore terminées
  if (user && (isOnboardingPage && (!!schoolId || user.profile?.isAdmin)) || (!isOnboardingPage && !schoolId && !user.profile?.isAdmin)) {
      return <AuthProtectionLoader />;
  }

  // Si pas d'utilisateur et page privée, le loader reste affiché pendant la redirection
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
