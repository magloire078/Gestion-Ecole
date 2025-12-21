
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
      return; // Ne rien faire tant que les données ne sont pas chargées
    }

    const isPublicPage = ['/', '/login', '/contact'].includes(pathname) || pathname.startsWith('/public');
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
    const isSuperAdmin = user?.profile?.isAdmin === true;

    // Si l'utilisateur n'est pas connecté et n'est pas sur une page publique, rediriger vers login
    if (!user && !isPublicPage) {
      router.replace('/login');
      return;
    }

    // Si l'utilisateur est connecté
    if (user) {
      // S'il est sur la page de login, le rediriger vers le dashboard
      if (pathname === '/login') {
        router.replace('/dashboard');
        return;
      }

      // Si c'est un super admin, il a accès à tout (sauf l'onboarding)
      if (isSuperAdmin) {
        if (isOnboardingPage) {
          router.replace('/admin/system/dashboard');
        }
        return; // Le super admin peut continuer
      }
      
      // Si l'utilisateur standard n'a pas d'ID d'école et n'est pas déjà sur la page d'onboarding,
      // on le redirige vers l'onboarding. C'est la seule redirection liée à l'onboarding.
      if (!schoolId && !isOnboardingPage) {
        router.replace('/dashboard/onboarding');
        return;
      }
    }
  }, [user, schoolId, loading, pathname, router]);

  // --- Logique d'affichage pendant le chargement ---

  const isPublicPage = ['/', '/login', '/contact'].includes(pathname) || pathname.startsWith('/public');

  // Afficher le loader sur les pages protégées pendant que l'on vérifie l'authentification
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si l'utilisateur n'est pas authentifié et essaie d'accéder à une page protégée,
  // afficher le loader pendant que useEffect fait son travail de redirection.
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si tout est en ordre, afficher le contenu de la page.
  return <>{children}</>;
}
