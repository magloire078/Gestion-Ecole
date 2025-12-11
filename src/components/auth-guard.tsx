
'use client';

import { useUser, useFirestore } from '@/firebase';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

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
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname(); // Get the current path
  const [isVerified, setIsVerified] = useState(false);
  const isLoading = userLoading || !isVerified;

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }
    
    // If the user is on any onboarding page, allow access without verification yet.
    if (pathname.startsWith('/dashboard/onboarding')) {
        setIsVerified(true);
        return;
    }

    const checkOnboarding = async () => {
      const userRootRef = doc(firestore, 'utilisateurs', user.uid);
      try {
        const docSnap = await getDoc(userRootRef);
        if (docSnap.exists() && docSnap.data()?.schoolId) {
          setIsVerified(true);
        } else {
          router.replace('/dashboard/onboarding');
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'onboarding:", error);
        router.replace('/dashboard/onboarding');
      }
    };

    checkOnboarding();
  }, [user, userLoading, firestore, router, pathname]);


  if (isLoading) {
    return <AuthProtectionLoader />;
  }

  return <>{children}</>;
}
