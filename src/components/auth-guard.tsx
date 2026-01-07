
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
  const [isReadyToRender, setIsReadyToRender] = useState(false);

  useEffect(() => {
    if (loading) {
      return; // Attendre que l'état d'authentification soit résolu
    }

    const isPublicPage = ['/auth/login', '/auth/register', '/auth/forgot-password', '/contact', '/survey', '/parent-access', '/terms', '/privacy'].some(p => pathname.startsWith(p)) || pathname === '/';
    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isParentSession = !!localStorage.getItem('parent_session_id');

    if (isPublicPage) {
      if (user || isParentSession) {
        // Utilisateur connecté ou en session parent sur une page publique -> rediriger vers le tableau de bord
        router.replace('/dashboard');
      } else {
        // Utilisateur non connecté sur une page publique -> afficher la page
        setIsReadyToRender(true);
      }
      return;
    }

    // --- À partir d'ici, nous sommes sur une page protégée ---
    
    if (!user && !isParentSession) {
      // Non connecté et pas de session parent -> rediriger vers la connexion
      router.replace('/auth/login');
      return;
    }

    if (user && !user.schoolId && !isOnboardingPage && !isParentSession) {
      // Connecté mais sans école et pas sur l'onboarding -> rediriger vers l'onboarding
      router.replace('/onboarding');
      return;
    }

    // Si toutes les conditions sont remplies, on peut afficher le contenu
    setIsReadyToRender(true);

  }, [user, loading, pathname, router]);

  // N'afficher le contenu que lorsque toutes les vérifications et redirections potentielles sont terminées.
  // Pendant ce temps, `AuthProtectionLoader` est affiché pour éviter les erreurs d'hydratation.
  if (!isReadyToRender) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
