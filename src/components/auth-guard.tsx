
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || loading) {
      return; 
    }

    const isPublicPage = ['/auth/login', '/auth/register', '/auth/forgot-password', '/contact', '/survey', '/parent-access', '/terms', '/privacy'].some(p => pathname.startsWith(p)) || pathname === '/';
    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isParentSession = !!localStorage.getItem('parent_session_id');

    if (isParentSession) {
      if (isPublicPage) {
        router.replace('/dashboard');
      }
      return;
    }

    if (!user && !isPublicPage) {
      router.replace('/auth/login');
      return;
    }

    if (user) {
        if (isPublicPage) {
            router.replace('/dashboard');
            return;
        }

        const hasSchool = !!user.schoolId;
        if (hasSchool && isOnboardingPage) {
            router.replace('/dashboard');
        } else if (!hasSchool && !isOnboardingPage && pathname.startsWith('/dashboard')) {
            router.replace('/onboarding');
        }
    }
  }, [user, loading, pathname, router, isClient]);

  const isPublicPage = ['/auth/login', '/auth/register', '/auth/forgot-password', '/contact', '/survey', '/parent-access', '/terms', '/privacy'].some(p => pathname.startsWith(p)) || pathname === '/';

  // Pendant le chargement initial ou sur une page non publique sans utilisateur, afficher le loader.
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // Gérer le cas où on est sur le client, le chargement est terminé, mais l'utilisateur n'est pas là et la page n'est pas publique.
  if (isClient && !loading && !user && !isPublicPage && !localStorage.getItem('parent_session_id')) {
    return <AuthProtectionLoader />; // Affiche le loader pendant la redirection
  }

  return <>{children}</>;
}
