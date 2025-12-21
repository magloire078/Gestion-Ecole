
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
  const { user, schoolId, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  
  // This state helps manage the transition right after school creation
  const [isPostCreation, setIsPostCreation] = useState(false);

  useEffect(() => {
    // Check for a special URL param to know we just created a school
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('created')) {
      setIsPostCreation(true);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);


  useEffect(() => {
    // 1. Wait for auth state to be fully resolved.
    // If we're in the post-creation transition, also wait for schoolId to be populated.
    if (loading || (isPostCreation && schoolId === null)) {
      return;
    }
    
    const isPublicPage = ['/', '/login', '/contact'].includes(pathname);
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

    // 2. User is not logged in
    if (!user) {
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }

    // 3. User is logged in
    if (user) {
       // On a public page (like /login), redirect to dashboard
       if(isPublicPage) {
         router.replace('/dashboard');
         return;
       }

       // No schoolId and not a Super Admin, needs onboarding
       if (schoolId === null && user.profile?.isAdmin !== true) {
         if (!isOnboardingPage) {
           router.replace('/dashboard/onboarding');
         }
         return;
       }
    }
    
    // If we were in post-creation, the transition is over
    if(isPostCreation && schoolId !== null) {
      setIsPostCreation(false);
    }

  }, [user, schoolId, loading, pathname, router, isPostCreation]);

  
  // This is the critical part to prevent flickering.
  // We show a loader during the initial auth check and during the special post-creation transition.
  const shouldShowLoader = loading || (isPostCreation && schoolId === null);
  
  const isPublicPage = ['/', '/login', '/contact'].includes(pathname);
  if (shouldShowLoader && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // If loading is done, but there's no user on a protected page,
  // we also show the loader while the redirection to /login happens.
  if (!loading && !user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
