
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
    // Ne rien faire tant que l'état initial n'est pas résolu.
    if (loading) {
      return;
    }

    const isPublicPage = ['/', '/login', '/contact'].includes(pathname) || pathname.startsWith('/public');

    // Si pas d'utilisateur et page protégée -> login
    if (!user && !isPublicPage) {
      router.replace('/login');
      return;
    }

    if (user) {
      // Si connecté et sur une page publique (comme login) -> dashboard
      if (isPublicPage) {
        router.replace('/dashboard');
        return;
      }
      
      // Si connecté mais pas d'école et pas sur une page d'onboarding -> onboarding
      if (!schoolId && !pathname.startsWith('/dashboard/onboarding') && user?.profile?.isAdmin !== true) {
         router.replace('/dashboard/onboarding');
         return;
      }
    }

  }, [user, schoolId, loading, pathname, router]);

  // Si l'état de l'authentification est en cours de chargement,
  // et que nous ne sommes pas sur une page publique, afficher un loader.
  // C'est la clé pour empêcher le "flash".
  const isPublicPage = ['/', '/login', '/contact'].includes(pathname);
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }
  
  // Si le chargement est terminé, mais qu'il n'y a pas d'utilisateur sur une page protégée,
  // AuthProtectionLoader est affiché pendant que le useEffect redirige.
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si tout est en ordre (ou si c'est une page publique), afficher le contenu.
  return <>{children}</>;
}
