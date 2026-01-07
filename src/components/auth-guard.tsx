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

  const isPublicPage = ['/auth/login', '/auth/register', '/auth/forgot-password', '/contact', '/survey', '/parent-access', '/terms', '/privacy'].some(p => pathname.startsWith(p)) || pathname === '/';
  const isOnboardingPage = pathname.startsWith('/onboarding');
  
  useEffect(() => {
    if (loading) {
      return; // Ne rien faire tant que l'état de l'utilisateur n'est pas résolu
    }

    if (!user && !isPublicPage) {
      router.replace('/auth/login');
      return;
    }

    if (user) {
        if (isPublicPage && !user.isParent) {
            router.replace('/dashboard');
            return;
        }

        if (!user.isParent) {
            const hasSchool = !!user.schoolId;
            if (hasSchool && isOnboardingPage) {
                router.replace('/dashboard');
            } else if (!hasSchool && !isOnboardingPage && pathname.startsWith('/dashboard')) {
                router.replace('/onboarding');
            }
        }
    }
  }, [user, loading, pathname, isPublicPage, isOnboardingPage, router]);

  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Si on est sur une page protégée mais sans utilisateur, on affiche le loader pendant la redirection.
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
