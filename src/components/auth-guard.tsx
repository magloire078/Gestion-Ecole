
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const { user, schoolId, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // État pour gérer la transition après création d'école
  const [justCreatedSchool, setJustCreatedSchool] = useState(false);

  useEffect(() => {
    // Vérifier si on vient de créer une école (via paramètre URL)
    const fromCreation = searchParams.get('created');
    if (fromCreation === 'true') {
      setJustCreatedSchool(true);
      // Nettoyer l'URL
      const newUrl = pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, pathname]);

  useEffect(() => {
    // Ne rien faire tant que l'état initial n'est pas résolu.
    if (loading) {
      return;
    }

    const isPublicPage = ['/', '/login', '/contact'].includes(pathname) || pathname.startsWith('/public');
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');
    const isSuperAdmin = user?.profile?.isAdmin === true;

    // ========== SCÉNARIO 1: UTILISATEUR NON CONNECTÉ ==========
    if (!user && !isPublicPage) {
      router.replace('/login');
      return;
    }

    // ========== SCÉNARIO 2: UTILISATEUR CONNECTÉ ==========
    if (user) {
      // 2A: Sur page publique -> rediriger vers dashboard
      if (isPublicPage) {
        router.replace('/dashboard');
        return;
      }

      // 2B: Super admin -> pas de vérification d'école
      if (isSuperAdmin) {
        // Si super admin sur onboarding, rediriger vers admin dashboard
        if (isOnboardingPage) {
          router.replace('/admin/system/dashboard');
        }
        return; // Super admin peut rester sur la page
      }

      // 2C: Vérification ÉCOLE
      // schoolId peut être: undefined (loading), null (pas d'école), string (a une école)
      
      // CAS SPÉCIAL: On vient juste de créer une école
      if (justCreatedSchool) {
        // Attendre un peu pour que les données se synchronisent
        const timer = setTimeout(() => {
          if (schoolId && isOnboardingPage) {
            router.replace('/dashboard');
          }
        }, 1000);
        
        setJustCreatedSchool(false);
        return () => clearTimeout(timer);
      }

      // CAS NORMAL: Pas d'école
      if (schoolId === null) {
        // Pas d'école -> aller à l'onboarding
        if (!isOnboardingPage) {
          router.replace('/dashboard/onboarding');
        }
        return;
      }

      // CAS NORMAL: A une école
      if (schoolId && typeof schoolId === 'string') {
        // A une école mais sur onboarding -> aller au dashboard
        if (isOnboardingPage) {
          router.replace('/dashboard');
        }
        return;
      }

      // CAS: schoolId est undefined (chargement en cours)
      // Ne rien faire, attendre le prochain cycle
      return;
    }

  }, [user, schoolId, loading, pathname, router, justCreatedSchool]);

  // ========== LOGIQUE D'AFFICHAGE ==========
  
  const isPublicPage = ['/', '/login', '/contact'].includes(pathname) || pathname.startsWith('/public');
  const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

  // 1. Pendant le chargement sur page protégée -> loader
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // 2. Utilisateur non connecté sur page protégée -> loader (redirection en cours)
  if (!user && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // 3. État de transition critique (après création d'école)
  // Pendant que schoolId passe de null à string, éviter les flashes
  if (user && schoolId === undefined && !isOnboardingPage && user.profile?.isAdmin !== true) {
    // Afficher le loader pendant maximum 3 secondes
    return <AuthProtectionLoader />;
  }

  // 4. Tout est OK, afficher le contenu
  return <>{children}</>;
}
