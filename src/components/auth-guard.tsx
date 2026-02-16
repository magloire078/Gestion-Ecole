
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
    const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/parent-access', '/', '/contact', '/survey'];
    const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (!loading) {
      if (!user && !isPublicPath) {
        // Petit délai de grâce pour laisser Firebase stabiliser la session
        const timer = setTimeout(() => {
          router.replace('/auth/login');
        }, 500);
        return () => clearTimeout(timer);
      }

      if (user) {
        if (pathname.startsWith('/auth')) {
          router.replace('/dashboard');
          return;
        }

        if (!user.isParent && !hasSchool && !pathname.startsWith('/onboarding') && !pathname.startsWith('/auth')) {
          router.replace('/onboarding');
          return;
        }
      }
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
