
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import LandingPageV2 from '@/components/landing-page-v2';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || loading) {
      return;
    }

    if (user) {
      if (user.schoolId) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, loading, isClient, router]);
  
  if (loading || (isClient && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-lg font-semibold">Chargement...</p>
         </div>
      </div>
    );
  }

  // Si le chargement est terminé et qu'il n'y a pas d'utilisateur, on affiche la landing page.
  return <LandingPageV2 />;
}
