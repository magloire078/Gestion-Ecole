'use client';

import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  
  const isLoading = userLoading || schoolLoading;
  
  useEffect(() => {
    if (isLoading) {
      return;
    }
    
    const checkAccess = () => {
      setIsChecking(true);
      
      const isPublicPage = pathname === '/' || pathname.startsWith('/public');
      const isAuthPage = pathname === '/login';
      const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
      
      // Pages publiques
      if (isPublicPage) {
        setIsChecking(false);
        return;
      }
      
      // Non authentifié
      if (!user) {
        if (!isAuthPage) {
          router.replace('/login');
          return;
        }
        setIsChecking(false);
        return;
      }
      
      // Authentifié
      if (!schoolId) {
        // Pas d'école
        if (!isOnboardingPage) {
          router.replace('/dashboard/onboarding');
          return;
        }
      } else {
        // A une école
        if (isAuthPage || isOnboardingPage) {
          router.replace('/dashboard');
          return;
        }
      }
      
      // Tout est OK
      setIsChecking(false);
    };
    
    checkAccess();
  }, [user, schoolId, isLoading, pathname, router]);
  
  // Afficher le loader pendant les vérifications
  if (isLoading || isChecking) {
    // Sauf pour les pages qui peuvent être affichées pendant le chargement
    if (pathname === '/login' || pathname.startsWith('/public') || pathname === '/') {
      return <>{children}</>;
    }
    return <AuthProtectionLoader />;
  }
  
  return <>{children}</>;
}
