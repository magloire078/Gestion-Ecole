
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { LoadingScreen } from './ui/loading-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hasSchool, loading } = useUser();

  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/parent-access', '/', '/contact', '/survey'];
    const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (!user) {
      if (!isPublicPath) {
        router.replace('/auth/login');
      }
      return;
    }

    // User is logged in
    const isAuthPath = pathname.startsWith('/auth');
    if (isAuthPath) {
      router.replace('/dashboard');
      return;
    }

    const isOnboardingPath = pathname.startsWith('/onboarding');
    if (!user.isParent && !hasSchool && !isOnboardingPath) {
      router.replace('/onboarding');
      return;
    }
  }, [user, hasSchool, loading, router, pathname]);

  if (loading) {
    return <LoadingScreen />;
  }

  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/parent-access', '/', '/contact', '/survey'];
  if (!user && !publicPaths.some(p => pathname.startsWith(p))) {
    return <LoadingScreen />;
  }

  if (user && !user.isParent && !hasSchool && !pathname.startsWith('/onboarding')) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
