
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
    // Ne rien faire si nous ne sommes pas côté client ou si l'état de l'utilisateur n'est pas encore résolu.
    if (!isClient || loading) {
      return;
    }

    if (user) {
      if (user.schoolId) {
        // Utilisateur connecté avec une école -> Tableau de bord
        router.replace('/dashboard');
      } else {
        // Utilisateur connecté sans école -> Onboarding
        router.replace('/onboarding');
      }
    }
    // Si 'user' est null, on reste sur la page d'accueil (LandingPageV2).
  }, [user, loading, isClient, router]);
  
  // Affiche un loader plein écran tant que l'état d'authentification est incertain ou
  // si une redirection est en cours. Cela empêche tout flash de la page d'accueil.
  if (!isClient || loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-lg font-semibold">Chargement...</p>
         </div>
      </div>
    );
  }

  // Si l'état de chargement est terminé et qu'il n'y a pas d'utilisateur, afficher la landing page.
  return <LandingPageV2 />;
}
