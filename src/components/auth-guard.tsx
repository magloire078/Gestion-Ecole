
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="text-lg font-semibold">Chargement de votre session...</p>
        <p className="text-muted-foreground">Veuillez patienter.</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [isParent, setIsParent] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if(localStorage.getItem('parent_session_id')) {
        setIsParent(true);
    }
  }, []);

  const effectiveUser = isParent ? { isParent: true, ...user } : user;

  const publicPages = ['/auth/login', '/auth/register', '/auth/forgot-password', '/contact', '/survey', '/parent-access', '/terms', '/privacy'];
  const isPublicPage = publicPages.some(p => pathname.startsWith(p)) || pathname === '/';
  const isOnboardingPage = pathname.startsWith('/onboarding');
  
  useEffect(() => {
    if (loading || !isClient) {
      return;
    }

    if (!effectiveUser && !isPublicPage) {
      router.replace('/auth/login');
      return;
    }

    if (effectiveUser) {
        if (isPublicPage && !pathname.startsWith('/parent-access')) {
            router.replace('/dashboard');
            return;
        }

        if (!effectiveUser.isParent) {
            const hasSchool = !!effectiveUser.schoolId;
            if (hasSchool && isOnboardingPage) {
                router.replace('/dashboard');
            } else if (!hasSchool && !isOnboardingPage && pathname.startsWith('/dashboard')) {
                router.replace('/onboarding');
            }
        }
    }
  }, [effectiveUser, loading, pathname, isPublicPage, isOnboardingPage, router, isClient]);

  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si on est sur une page protégée mais sans utilisateur, on affiche le loader pendant la redirection.
  if (!effectiveUser && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
