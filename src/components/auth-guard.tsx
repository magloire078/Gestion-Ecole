
'use client';

import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
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
  const { user, loading: userLoading, schoolId } = useUser();
  const { loading: schoolLoading } = useSchoolData();
  const router = useRouter();
  const pathname = usePathname();
  const loading = userLoading || schoolLoading;
  
  const isPublicPage = ['/', '/login', '/contact'].includes(pathname) || pathname.startsWith('/public');
  const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

  useEffect(() => {
    if (loading) {
      return; // Ne rien faire pendant que les données chargent
    }
    
    // 1. Utilisateur non connecté
    if (!user) {
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }
    
    // 2. Utilisateur connecté
    if (isPublicPage) {
        router.replace('/dashboard');
        return;
    }
    
    // Logique pour l'onboarding
    const isAssociatedWithSchool = !!schoolId;
    const isSuperAdmin = user.profile?.isAdmin === true;

    if (!isAssociatedWithSchool && !isSuperAdmin) {
      // Si pas d'école et pas admin, doit aller sur l'onboarding
      if (!isOnboardingPage) {
        router.replace('/dashboard/onboarding');
      }
    } else if (isAssociatedWithSchool || isSuperAdmin) {
      // Si une école est associée (ou si c'est un super admin),
      // il ne doit PAS être sur les pages d'onboarding.
      if (isOnboardingPage) {
        router.replace('/dashboard');
      }
    }
    
  }, [user, schoolId, loading, pathname, isPublicPage, isOnboardingPage, router]);


  // Affiche un loader si on est sur une page privée et que les infos chargent
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si pas d'utilisateur et page privée, le loader reste affiché pendant la redirection
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
