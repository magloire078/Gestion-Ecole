'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { LoadingScreen } from './ui/loading-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hasSchool, loading } = useUser();
  const [isClient, setIsClient] = useState(false);

  // This ensures that the component only runs on the client side.
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Wait until loading is complete and we are on the client
    if (!isClient || loading) {
      return; 
    }

    // If no user is authenticated, redirect to login
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    
    // If user is authenticated but has no school association (and is not a parent), redirect to onboarding
    if (user && !user.isParent && !hasSchool) {
      router.replace('/onboarding');
      return;
    }

  }, [isClient, user, hasSchool, loading, router]);
  
  // While loading or on the server, show a loading screen.
  // Also show loading if a redirection is imminent to prevent content flash.
  if (loading || !isClient || !user || (!user.isParent && !hasSchool)) {
    return <LoadingScreen />;
  }
  
  // If all checks pass, render the children components.
  return <>{children}</>;
}
