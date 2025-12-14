
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
    
    if (!user) {
      if (!isAuthPage) {
        router.replace('/login');
      }
    } else {
        if (schoolId) {
             if (isAuthPage || isOnboardingPage) {
                router.replace('/dashboard');
            }
        } else {
            if (!isOnboardingPage) {
                router.replace('/dashboard/onboarding');
            }
        }
    }

  }, [user, schoolId, isLoading, pathname, router]);

  if (isLoading) {
      return <AuthProtectionLoader />;
  }
  
  if (!user && !pathname.startsWith('/login')) {
      return <AuthProtectionLoader />;
  }

  if (user && !schoolId && !pathname.startsWith('/dashboard/onboarding')) {
      return <AuthProtectionLoader />;
  }
  
  if (user && schoolId && (pathname.startsWith('/dashboard/onboarding') || pathname.startsWith('/login'))) {
      return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
