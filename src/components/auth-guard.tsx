
'use client';

import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-semibold">Chargement...</p>
        <p className="text-muted-foreground">Vérification de votre compte et de votre école.</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (userLoading) {
      return; // Attendre la fin du chargement de l'utilisateur
    }

    if (!user) {
      // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
      if (pathname !== '/login') {
        router.replace('/login');
      } else {
        setIsVerified(true); // Autoriser l'accès à la page de connexion elle-même
      }
      return;
    }

    // L'utilisateur est connecté
    const schoolId = user.customClaims?.schoolId;

    if (schoolId) {
      // L'utilisateur est associé à une école.
      if (pathname.startsWith('/dashboard/onboarding')) {
        // S'il est déjà onboardé, le rediriger vers le tableau de bord principal
        router.replace('/dashboard');
      } else {
        // Autoriser l'accès à toutes les autres pages du tableau de bord
        setIsVerified(true);
      }
    } else {
      // L'utilisateur n'est pas encore associé à une école.
      if (pathname.startsWith('/dashboard/onboarding') || pathname === '/dashboard') {
         // Autoriser l'accès aux pages d'onboarding ou à la page racine du dashboard qui redirigera
        setIsVerified(true);
      } else {
        // Le rediriger vers le processus d'onboarding pour toute autre page
        router.replace('/dashboard/onboarding');
      }
    }

  }, [user, userLoading, pathname, router]);

  if (userLoading || !isVerified) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
