
'use client';

import { useUser } from '@/firebase';
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
  const { user, loading: userLoading, schoolId, isDirector } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  
  const isLoading = userLoading;
  
  useEffect(() => {
    if (isLoading) {
      return;
    }
    
    const checkAccess = () => {
      setIsChecking(true);
      
      const isPublicPage = pathname === '/' || pathname.startsWith('/public') || pathname === '/contact';
      const isAuthPage = pathname === '/login';
      const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
      
      if (isPublicPage) {
        setIsChecking(false);
        return;
      }
      
      if (!user || !user.authUser) {
        if (!isAuthPage) {
          router.replace('/login');
          return;
        }
        setIsChecking(false);
        return;
      }
      
      const isSuperAdmin = user.profile?.isAdmin === true;

      // Super Admins and Directors have access to everything, except they should be redirected from onboarding if already set up.
      if (isSuperAdmin || isDirector) {
        if (isOnboardingPage && schoolId) {
          router.replace('/dashboard');
          return;
        }
        setIsChecking(false);
        return;
      }
      
      if (!schoolId) {
        if (!isOnboardingPage) {
          router.replace('/dashboard/onboarding');
          return;
        }
      } else {
        if (isAuthPage || isOnboardingPage) {
          router.replace('/dashboard');
          return;
        }
      }
      
      setIsChecking(false);
    };
    
    checkAccess();
  }, [user, schoolId, isDirector, isLoading, pathname, router]);
  
  if (isLoading || isChecking) {
    if (pathname === '/login' || pathname.startsWith('/public') || pathname === '/' || pathname === '/contact') {
      return <>{children}</>;
    }
    return <AuthProtectionLoader />;
  }
  
  return <>{children}</>;
}

    