
'use client';

import { useAuthContext } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingScreen } from './ui/loading-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isParentSession, hasSchool, isInitialized, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (!isInitialized || loading) {
      return; 
    }
    
    const isAuthFlow = pathname.startsWith('/auth') || pathname === '/parent-access';
    const isOnboarding = pathname.startsWith('/onboarding');
    
    // Handle authenticated users (staff/admin or parent)
    if (user || isParentSession) {
      if (hasSchool) {
        // User is fully authenticated and has a school
        if (isAuthFlow || isOnboarding) {
          router.replace('/dashboard');
        }
      } else if (!isParentSession) { // Only staff/admins without a school go to onboarding
        // User is authenticated but hasn't joined/created a school
        if (!isOnboarding) {
          router.replace('/onboarding');
        }
      }
    } else {
      // Handle unauthenticated users
      const publicPages = ['/', '/contact', '/survey', '/terms', '/privacy'];
      if (!isAuthFlow && !publicPages.includes(pathname)) {
        router.replace('/auth/login');
      }
    }

  }, [user, isParentSession, hasSchool, isInitialized, loading, pathname, router]);

  if (loading || !isInitialized) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
