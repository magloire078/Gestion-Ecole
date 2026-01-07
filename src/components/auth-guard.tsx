
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
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  
  const publicPages = ['/login', '/register', '/contact', '/survey', '/parent-access'];
  const isPublicPage = publicPages.some(p => pathname.startsWith(p)) || pathname === '/';
  const isOnboardingPage = pathname.startsWith('/onboarding');

  useEffect(() => {
    if (loading) {
      return; 
    }
    
    if (!user && !isPublicPage) {
      router.replace('/login');
      return;
    }
    
    if (user) {
      if (isPublicPage) {
        router.replace('/dashboard');
        return;
      }
      
      const hasSchool = user.schoolId;

      if (hasSchool && isOnboardingPage) {
        router.replace('/dashboard');
      }
      
      if (!hasSchool && !isOnboardingPage && pathname.startsWith('/dashboard')) {
        router.replace('/onboarding');
      }
    }
    
  }, [user, loading, pathname, isPublicPage, isOnboardingPage, router]);

  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  if (user && !user.schoolId && !isOnboardingPage && pathname.startsWith('/dashboard')) {
      return <AuthProtectionLoader />;
  }
  
  if (!user && !isPublicPage) {
      return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
