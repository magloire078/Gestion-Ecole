
'use client';

import { useUser } from '@/firebase';
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
  const { user, schoolId, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      // Don't do anything while the user state is loading.
      // The loader below will be displayed.
      return;
    }

    const isAuthPage = pathname === '/login';
    const isPublicPage = isAuthPage || pathname === '/' || pathname.startsWith('/public') || pathname === '/contact';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

    // Case 1: No user is logged in.
    if (!user) {
      if (!isPublicPage) {
        // If on a protected page, redirect to login.
        router.replace('/login');
      }
      // Otherwise, allow access to public pages.
      return;
    }

    // Case 2: User is logged in.
    if (isAuthPage) {
      // If on the login page, redirect to the dashboard.
      router.replace('/dashboard');
      return;
    }
    
    const isSuperAdmin = user.profile?.isAdmin === true;

    // Case 3: User is logged in but has no schoolId (and is not a super admin).
    if (!schoolId && !isSuperAdmin) {
      if (!isOnboardingPage) {
        // Force onboarding if they are not already on an onboarding page.
        router.replace('/dashboard/onboarding');
      }
      return;
    }

    // Case 4: User has a schoolId but is on an onboarding page.
    if (schoolId && isOnboardingPage) {
      // Redirect them to the main dashboard.
      router.replace('/dashboard');
      return;
    }

  }, [user, schoolId, loading, pathname, router]);

  // Render a loader while the auth state is being determined.
  // This prevents the "flash" of content before redirection logic kicks in.
  if (loading) {
    return <AuthProtectionLoader />;
  }
  
  // If the user is logged in, but we're still waiting for the schoolId,
  // show a loader to prevent flashing the onboarding page.
  if (user && !schoolId && !pathname.startsWith('/dashboard/onboarding') && user.profile?.role !== 'super_admin') {
      return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
