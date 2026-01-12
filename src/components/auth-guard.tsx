
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
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
      return;
    }
    
    if (user && !user.isParent && !hasSchool) {
      router.replace('/onboarding');
      return;
    }

  }, [isClient, user, hasSchool, loading, router]);
  
  if (loading || !isClient) {
    return <LoadingScreen />;
  }
  
  if (!user || (!user.isParent && !hasSchool)) {
    return <LoadingScreen />;
  }
  
  return <>{children}</>;
}
