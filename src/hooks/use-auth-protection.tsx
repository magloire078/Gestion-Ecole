
'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Logo } from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';

export function useAuthProtection() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'onboarding' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || userLoading) {
      return; // Wait for client and user loading
    }

    if (!user) {
      setAuthStatus('unauthenticated');
      router.push('/login');
      return;
    }

    // User is authenticated, check onboarding status
    const userDocRef = doc(firestore, 'utilisateurs', user.uid);
    getDoc(userDocRef).then(docSnap => {
      if (docSnap.exists()) {
        setAuthStatus('authenticated');
      } else {
        setAuthStatus('onboarding');
        router.push('/onboarding');
      }
    }).catch(error => {
      console.error("Error checking onboarding status:", error);
      // Fallback: if there's an error, redirect to onboarding to be safe
      setAuthStatus('onboarding');
      router.push('/onboarding');
    });

  }, [user, userLoading, router, isClient, firestore]);
  
  const isLoading = authStatus === 'loading' || !isClient;

  const AuthProtectionLoader = () => (
      <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center">
              <p className="text-lg font-semibold">Chargement...</p>
              <p className="text-muted-foreground">Vérification de votre compte et de votre école.</p>
          </div>
      </div>
  );

  return { isLoading, AuthProtectionLoader };
}
