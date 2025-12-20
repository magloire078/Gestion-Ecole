
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
  const [justCreatedSchool, setJustCreatedSchool] = useState(false);

  useEffect(() => {
    // Ce hook ne s'exécute qu'une seule fois au montage pour vérifier le paramètre d'URL.
    if (searchParams.get('fromOnboarding') === 'true') {
      setJustCreatedSchool(true);
      // Nettoyer l'URL pour que ce paramètre ne persiste pas
      const newUrl = window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    // Si les données utilisateur sont encore en cours de chargement, on ne fait rien.
    if (loading) {
      return;
    }
    
    // Si l'utilisateur vient de créer une école, mais que le schoolId n'est pas encore
    // propagé dans le hook useUser, on attend et on affiche le loader.
    if (justCreatedSchool && !schoolId) {
        // On ne fait rien et on laisse le loader s'afficher (voir plus bas)
        return;
    } else if (justCreatedSchool && schoolId) {
        // Le schoolId est enfin arrivé, on peut désactiver le mode spécial.
        setJustCreatedSchool(false);
    }

    const isAuthPage = pathname === '/login';
    const isPublicPage = isAuthPage || pathname === '/' || pathname.startsWith('/public') || pathname === '/contact';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

    // Cas 1 : Utilisateur non authentifié
    if (!user) {
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }

    // Cas 2 : Utilisateur authentifié
    if (isAuthPage) {
      router.replace('/dashboard');
      return;
    }
    
    // Cas 3 : Utilisateur connecté sans école (et non super-admin) -> Forcer l'onboarding
    if (!schoolId && user.profile?.role !== 'super_admin') {
      if (!isOnboardingPage) {
        router.replace('/dashboard/onboarding');
      }
      return;
    }

    // Cas 4 : Utilisateur connecté avec une école, mais sur une page d'onboarding -> Aller au dashboard
    if (schoolId && isOnboardingPage) {
      router.replace('/dashboard');
      return;
    }

  }, [user, schoolId, loading, pathname, router, justCreatedSchool]);
  
  // Logique d'affichage du Loader
  // Si le statut de l'utilisateur est en cours de chargement, on affiche un loader pour toutes les pages protégées
  if (loading && !pathname.startsWith('/login') && pathname !== '/') {
    return <AuthProtectionLoader />;
  }

  // Cas spécifique de l'après-création d'école
  if (justCreatedSchool && !schoolId) {
      return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
