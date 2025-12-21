
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

    // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
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
      
      // La seule redirection liée à l'onboarding que ce garde doit faire :
      // si l'utilisateur est connecté mais n'a PAS de schoolId, le forcer vers la page d'onboarding.
      if (!schoolId && !pathname.startsWith('/dashboard/onboarding') && user?.profile?.isAdmin !== true) {
         router.replace('/dashboard/onboarding');
         return;
      }
    }
  }, [user, schoolId, loading, pathname, router]);

  const isPublicPage = ['/', '/login', '/contact'].includes(pathname);
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
