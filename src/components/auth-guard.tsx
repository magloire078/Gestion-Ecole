
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
  
  // The crucial check: we wait until BOTH user and school data fetching are complete.
  const isLoading = userLoading || schoolLoading;
  
  useEffect(() => {
    // Don't do anything until all data is loaded.
    if (isLoading) {
      return; 
    }

    const isAuthPage = pathname === '/login';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
    
    if (!user) {
      // User is not logged in, must go to login page.
      if (!isAuthPage) {
        router.replace('/login');
      }
    } else {
        // User is logged in. Now check for school association.
        if (schoolId) {
            // User has a school. They should NOT be on login or onboarding.
             if (isAuthPage || isOnboardingPage) {
                router.replace('/dashboard');
            }
        } else {
            // User has NO school. They MUST go to onboarding.
            if (!isOnboardingPage) {
                router.replace('/dashboard/onboarding');
            }
        }
    }

  }, [user, schoolId, isLoading, pathname, router]);

  // Render a loader if we are still fetching critical data, or if a redirect is imminent.
  // This prevents rendering a page for a split second before redirecting.
  if (isLoading) {
      return <AuthProtectionLoader />;
  }
  
  // Specific condition to show loader while redirecting away from a protected route
  if (!user && !pathname.startsWith('/login')) {
      return <AuthProtectionLoader />;
  }

  // Specific condition to show loader while redirecting an authenticated user to onboarding
  if (user && !schoolId && !pathname.startsWith('/dashboard/onboarding')) {
      return <AuthProtectionLoader />;
  }
  
  // Specific condition to show loader while redirecting an onboarded user away from onboarding/login
  if (user && schoolId && (pathname.startsWith('/dashboard/onboarding') || pathname.startsWith('/login'))) {
      return <AuthProtectionLoader />;
  }


  // If all checks pass, render the children.
  return <>{children}</>;
}
