
'use client';

import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-semibold">Chargement de votre espace...</p>
        <p className="text-muted-foreground">Vérification de votre compte.</p>
      </div>
    </div>
  );
}


export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (userLoading) {
      return; // Ne rien faire tant que l'utilisateur n'est pas chargé
    }

    const isAuthPage = pathname === '/login';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
    const schoolId = user?.customClaims?.schoolId;

    if (!user) {
      // Si pas d'utilisateur et pas sur la page de login, rediriger vers le login
      if (!isAuthPage) {
        router.replace('/login');
      }
    } else {
      // Si l'utilisateur est connecté
      if (schoolId) {
        // Si l'utilisateur a une école et est sur une page d'onboarding/login, le rediriger au dashboard
        if (isOnboardingPage || isAuthPage) {
          router.replace('/dashboard');
        }
      } else {
        // Si l'utilisateur n'a pas d'école et n'est pas sur une page d'onboarding/login, le rediriger
        if (!isOnboardingPage && !isAuthPage) {
          router.replace('/dashboard/onboarding');
        }
      }
    }
  }, [user, userLoading, pathname, router]);

  // Affiche le loader si l'utilisateur est en cours de chargement
  if (userLoading) {
    return <AuthProtectionLoader />;
  }

  // Logique pour déterminer si on doit afficher les enfants ou attendre la redirection
  const isAuthPage = pathname === '/login';
  const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
  
  // Si l'utilisateur n'est pas chargé, on affiche toujours le loader (déjà géré au-dessus)
  // Si l'utilisateur n'est pas connecté et n'est pas sur la page de login, la redirection est en cours
  if (!user && !isAuthPage) {
    return <AuthProtectionLoader />;
  }
  
  // Si l'utilisateur est connecté mais n'a pas d'école et n'est pas sur une page d'onboarding, la redirection est en cours
  if (user && !user.customClaims?.schoolId && !isOnboardingPage && !isAuthPage) {
    return <AuthProtectionLoader />;
  }

  // Si l'utilisateur est connecté, a une école, mais se trouve sur une page d'onboarding/login, la redirection est en cours
  if (user && user.customClaims?.schoolId && (isOnboardingPage || isAuthPage)) {
    return <AuthProtectionLoader />;
  }

  // Si aucune des conditions de redirection n'est remplie, on affiche le contenu de la page
  return <>{children}</>;
}
