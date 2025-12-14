
'use client';

import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-semibold">Chargement de votre espace...</p>
        <p className="text-muted-foreground">Vérification de votre compte et de votre établissement.</p>
      </div>
    </div>
  );
}


export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const router = useRouter();
  const pathname = usePathname();
  
  const isLoading = userLoading || schoolLoading;
  
  useEffect(() => {
    if (isLoading) {
      return; 
    }

    const isAuthPage = pathname === '/login';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
    
    // Si l'utilisateur n'est pas connecté, il doit aller sur la page de login
    if (!user) {
      if (!isAuthPage) {
        router.replace('/login');
      }
      return;
    }
    
    // Si l'utilisateur est connecté
    if (schoolId) {
      // Il a une école, il ne doit PAS être sur les pages de login ou d'onboarding
      if (isAuthPage || isOnboardingPage) {
        router.replace('/dashboard');
      }
    } else {
      // Il n'a pas d'école, il DOIT être sur la page d'onboarding
      if (!isOnboardingPage) {
        router.replace('/dashboard/onboarding');
      }
    }

  }, [user, schoolId, isLoading, pathname, router]);


  // Affiche le loader tant que la vérification n'est pas terminée
  if (isLoading) {
      return <AuthProtectionLoader />;
  }
  
  // Logique pour éviter l'affichage de la mauvaise page pendant la redirection
  if (!user && !pathname.startsWith('/login')) {
      return <AuthProtectionLoader />;
  }

  if (user && !schoolId && !pathname.startsWith('/dashboard/onboarding')) {
      return <AuthProtectionLoader />;
  }
  
  if (user && schoolId && (pathname.startsWith('/dashboard/onboarding') || pathname.startsWith('/login'))) {
      return <AuthProtectionLoader />;
  }

  // Si tout est correct, affiche la page demandée
  return <>{children}</>;
}
