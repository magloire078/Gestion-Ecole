
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
      return; // Ne rien faire tant que tout n'est pas chargé
    }

    const isAuthPage = pathname === '/login';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
    
    if (!user) {
      // Utilisateur non connecté -> doit aller sur la page de login
      if (!isAuthPage) {
        router.replace('/login');
      }
    } else {
        // Utilisateur connecté
        if (schoolId) {
            // A une école -> ne doit pas être sur login ou onboarding
             if (isAuthPage || isOnboardingPage) {
                router.replace('/dashboard');
            }
        } else {
            // N'a pas d'école -> doit aller sur onboarding
            if (!isOnboardingPage) {
                router.replace('/dashboard/onboarding');
            }
        }
    }

  }, [user, schoolId, isLoading, pathname, router]);

  // Si on charge ou si une redirection est imminente, on affiche le loader.
  if (isLoading || (!user && pathname !== '/login') || (user && !schoolId && !pathname.startsWith('/dashboard/onboarding'))) {
      return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
