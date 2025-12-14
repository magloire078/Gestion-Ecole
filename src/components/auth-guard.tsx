
'use client';

import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-semibold">Chargement...</p>
        <p className="text-muted-foreground">Vérification de votre compte et de votre école.</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // We wait until user loading is complete
    if (userLoading) {
      return;
    }

    // If no user is found, redirect to login page
    if (!user) {
      if (pathname !== '/login') {
        router.replace('/login');
      } else {
        setIsVerified(true);
      }
      return;
    }

    // User is logged in, now check for school association
    const schoolId = user.customClaims?.schoolId;

    if (schoolId) {
      // User is associated with a school.
      if (pathname.startsWith('/dashboard/onboarding')) {
        // If they land on onboarding, redirect them to the main dashboard.
        router.replace('/dashboard');
      } else {
        // Otherwise, they are authorized to see the page.
        setIsVerified(true);
      }
    } else {
      // User is not associated with a school.
      if (pathname.startsWith('/dashboard/onboarding') || pathname === '/login') {
        // Allow access to onboarding pages or login.
        setIsVerified(true);
      } else {
        // For any other page, redirect to the onboarding flow.
        router.replace('/dashboard/onboarding');
      }
    }

  }, [user, userLoading, pathname, router]);

  if (userLoading || !isVerified) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
