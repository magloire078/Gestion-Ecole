'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { LoadingScreen } from './ui/loading-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hasSchool, loading } = useUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || loading) {
      return; 
    }

    if (!user) {
      router.replace('/auth/login');
    } else if (!hasSchool) {
      router.replace('/onboarding');
    }
  }, [isClient, user, hasSchool, loading, router]);
  
  if (!isClient || loading) {
    return <LoadingScreen />;
  }

  if (!user || !hasSchool) {
    // Affiche un loader pendant que la redirection s'effectue pour éviter les flashs de contenu.
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
