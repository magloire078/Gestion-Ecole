
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
      
      // Public pages are always allowed
      if (isPublicPage) {
        setIsChecking(false);
        return;
      }
      
      // If user is not authenticated
      if (!user || !user.authUser) {
        if (!isAuthPage) {
          router.replace('/login');
          return;
        }
        setIsChecking(false);
        return;
      }
      
      // User is authenticated
      if (!schoolId) {
        // ... but has no school associated
        if (!isOnboardingPage) {
          router.replace('/dashboard/onboarding');
          return;
        }
      } else {
        // ... and has a school associated
        if (isAuthPage || isOnboardingPage) {
          router.replace('/dashboard');
          return;
        }
      }
      
      // All checks passed, allow access
      setIsChecking(false);
    };
    
    checkAccess();
  }, [user, schoolId, isLoading, pathname, router]);
  
  if (isLoading || isChecking) {
    if (pathname === '/login' || pathname.startsWith('/public') || pathname === '/') {
      return <>{children}</>;
    }
    return <AuthProtectionLoader />;
  }
  
  return <>{children}</>;
}
