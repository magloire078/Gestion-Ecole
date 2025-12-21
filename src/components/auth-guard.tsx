
'use client';

import { useUser, useSchoolData } from '@/firebase';
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
  const { user, loading: userLoading } = useUser();
  const { schoolData, loading: schoolLoading } = useSchoolData();
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
      // S'il est sur une page privée, rediriger vers login
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }
    
    // 2. Utilisateur connecté
    // Si connecté, rediriger depuis les pages publiques vers le dashboard
    if (isPublicPage) {
        router.replace('/dashboard');
        return;
    }
    
    // Si connecté mais sans école (et pas admin), rediriger vers l'onboarding
    const schoolId = user.profile?.schoolId;
    if (!schoolId && !user.profile?.isAdmin) {
        if (!isOnboardingPage) {
            router.replace('/dashboard/onboarding');
        }
        return;
    }
    
    // Si l'école est créée mais pas configurée, il reste sur le dashboard qui affichera le OnboardingDashboard
    // La redirection depuis /dashboard/onboarding vers /dashboard si la config est complète est gérée dans la page d'onboarding elle-même ou sur la page dashboard
    // si l'utilisateur y atterrit.
    
  }, [user, schoolData, loading, pathname, isPublicPage, isOnboardingPage, router]);


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
