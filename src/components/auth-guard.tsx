
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
    
    // Pages publiques accessibles à tous
    const publicPages = [
      '/', 
      '/contact', 
      '/survey', 
      '/terms', 
      '/privacy'
    ];
    const isPublicPage = publicPages.includes(pathname);

    // Pages d'authentification
    const authPages = [
      '/auth/login', 
      '/auth/register', 
      '/auth/forgot-password', 
      '/parent-access'
    ];
    const isAuthPage = authPages.includes(pathname);

    // Pages d'onboarding
    const onboardingPages = [
      '/onboarding',
      '/onboarding/create-school'
    ];
    const isOnboardingPage = onboardingPages.includes(pathname);

    if (user) {
      // Utilisateur connecté
      if (user.schoolId) {
        // ...et a une école
        if (isAuthPage || isOnboardingPage) {
          router.replace('/dashboard');
        }
      } else {
        // ...mais n'a pas d'école
        if (!isOnboardingPage) {
          router.replace('/onboarding');
        }
      }
    } else {
      // Utilisateur non connecté
      if (!isPublicPage && !isAuthPage && !isOnboardingPage) {
        router.replace('/auth/login');
      }
    }

  }, [user, loading, isClient, pathname, router]);

  // Pendant que l'état d'authentification se résout côté client,
  // pour éviter les flashs d'interface et les erreurs d'hydratation,
  // nous affichons un loader pour toutes les pages non publiques.
  if (loading && !publicPages.includes(pathname)) {
    return <AuthProtectionLoader />;
  }

  // Permettre l'affichage du contenu
  return <>{children}</>;
}
