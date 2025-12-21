
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';

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

// Version ultra-simple qui bloque tout pendant le chargement
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, schoolId, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = ['/', '/login', '/contact'].includes(pathname) || pathname.startsWith('/public');
  const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

  // 🔴 BLOCAGE TOTAL pendant le chargement
  if (loading && !isPublicPage) {
    return <AuthProtectionLoader />;
  }

  // 🔴 Ne rien afficher tant que tout n'est pas résolu
  if (!loading) {
    // 1. Non connecté sur page protégée -> login
    if (!user && !isPublicPage) {
      router.replace('/login');
      return <AuthProtectionLoader />;
    }

    // 2. Connecté sur page publique -> dashboard
    if (user && isPublicPage) {
      router.replace('/dashboard');
      return <AuthProtectionLoader />;
    }

    // 3. Connecté sans école (et pas super admin) -> onboarding
    if (user && schoolId === null && !isOnboardingPage && user.profile?.isAdmin !== true) {
      router.replace('/dashboard/onboarding');
      return <AuthProtectionLoader />;
    }

    // 4. Connecté avec école sur onboarding -> dashboard
    if (user && schoolId && isOnboardingPage) {
      router.replace('/dashboard');
      return <AuthProtectionLoader />;
    }
  }

  // Afficher seulement quand tout est résolu
  return <>{children}</>;
}
