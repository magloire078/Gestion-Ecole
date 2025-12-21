
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

  const isPublicPage = ['/', '/login', '/contact'].includes(pathname) || pathname.startsWith('/public');
  const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

  // Si on est encore en train de charger les infos de l'utilisateur,
  // et qu'on n'est pas sur une page publique, on affiche un loader.
  // Cela empêche toute redirection prématurée.
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Une fois le chargement terminé, on peut prendre des décisions.
  if (!loading) {
    // 1. L'utilisateur N'EST PAS connecté.
    if (!user) {
      // S'il essaie d'accéder à une page privée, on le redirige vers le login.
      if (!isPublicPage) {
        router.replace('/login');
        return <AuthProtectionLoader />; // Afficher le loader pendant la redirection.
      }
      // S'il est sur une page publique, on ne fait rien, il a le droit d'y être.
    }
    
    // 2. L'utilisateur EST connecté.
    else {
      // S'il est connecté et essaie d'aller sur une page publique (comme la landing page ou le login), on le redirige vers son tableau de bord.
      if (isPublicPage) {
        router.replace('/dashboard');
        return <AuthProtectionLoader />;
      }

      // S'il est connecté mais n'a pas encore d'école (et n'est pas super admin)...
      if (schoolId === null && !user.profile?.isAdmin) {
        // ...et qu'il n'est PAS sur la page d'onboarding, on l'y redirige.
        if (!isOnboardingPage) {
          router.replace('/dashboard/onboarding');
          return <AuthProtectionLoader />;
        }
        // S'il est déjà sur la page d'onboarding, on le laisse faire.
      }

      // S'il est connecté ET a une école, mais qu'il se retrouve sur la page d'onboarding, on le redirige vers le tableau de bord.
      if (schoolId && isOnboardingPage) {
        router.replace('/dashboard');
        return <AuthProtectionLoader />;
      }
    }
  }

  // Si aucune des conditions de redirection n'a été remplie, on affiche la page demandée.
  return <>{children}</>;
}
