
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
    // Ne rien faire tant que les données ne sont pas chargées
    if (loading) {
      return;
    }

    const isAuthPage = pathname === '/login';
    const isPublicPage = isAuthPage || pathname === '/' || pathname.startsWith('/public') || pathname === '/contact';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
    const isSuperAdmin = user?.profile?.isAdmin === true;

    // SCENARIO 1: L'utilisateur n'est pas connecté
    if (!user) {
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }

    // SCENARIO 2: L'utilisateur est connecté
    
    // Si sur une page d'authentification, rediriger vers le tableau de bord
    if (isAuthPage) {
      router.replace('/dashboard');
      return;
    }

    // Si c'est un super admin, il a accès à tout (sauf l'onboarding qu'il ne devrait jamais voir)
    if (isSuperAdmin) {
       if (isOnboardingPage) {
         router.replace('/admin/system/dashboard');
       }
       return;
    }

    // SCENARIO 3: L'utilisateur n'a pas d'école et n'est pas sur une page d'onboarding
    if (!schoolId && !isOnboardingPage) {
      router.replace('/dashboard/onboarding');
      return;
    }

    // NOTE: Le scénario 4 (utilisateur avec école sur une page d'onboarding) est maintenant géré par la page /dashboard
    // Cela empêche la boucle de redirection.

  }, [user, schoolId, loading, pathname, router]);

  // --- LOGIQUE D'AFFICHAGE ---

  const isPublicPage = pathname === '/' || pathname.startsWith('/public') || pathname === '/login' || pathname === '/contact';

  // Si le chargement est en cours pour une page protégée, afficher le loader
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si l'utilisateur est connecté, mais que nous attendons toujours le schoolId (état de transition),
  // et que ce n'est pas un super-admin, afficher le loader pour éviter le flash.
  if (user && !schoolId && !user.profile?.isAdmin && !pathname.startsWith('/dashboard/onboarding')) {
      return <AuthProtectionLoader />;
  }

  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page non publique,
  // afficher le loader pendant que useEffect le redirige.
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si tout est en ordre, afficher le contenu de la page
  return <>{children}</>;
}
