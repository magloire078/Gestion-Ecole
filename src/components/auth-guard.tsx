
'use client';

import { useUser, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { collection, doc, getDoc, query, where, getDocs, limit } from 'firebase/firestore';

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
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    // Attendre que les chargements soient terminés
    if (userLoading || schoolLoading) {
      return;
    }
    
    const isAuthPage = pathname === '/login';
    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

    // Utilisateur non connecté
    if (!user) {
      if (!isAuthPage) {
        router.replace('/login');
      } else {
        setIsChecking(false);
      }
      return;
    }

    // Utilisateur connecté
    if (schoolId) {
      // A une école - rediriger du login/onboarding vers le dashboard
      if (isAuthPage || isOnboardingPage) {
        router.replace('/dashboard');
      } else {
        setIsChecking(false);
      }
    } else {
        // N'a pas d'école - aller à l'onboarding
        if (!isOnboardingPage) {
            router.replace('/dashboard/onboarding');
        } else {
            setIsChecking(false);
        }
    }
  }, [user, schoolId, userLoading, schoolLoading, pathname, router]);
  
  // Afficher un loader pendant les vérifications
  if (isChecking) {
    return <AuthProtectionLoader />;
  }
  
  // Rendre les enfants
  return <>{children}</>;
}
