'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import LandingPageV2 from '@/components/landing-page-v2';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, schoolId } = useUser();

  useEffect(() => {
    // Ne pas rediriger tant que le statut d'authentification n'est pas certain
    if (loading) return;

    if (user) {
      if (schoolId) {
        // L'utilisateur est connecté et associé à une école -> Tableau de bord
        router.replace('/dashboard');
      } else {
        // L'utilisateur est connecté mais sans école -> Onboarding
        router.replace('/onboarding');
      }
    }
    // Si l'utilisateur n'est pas connecté, on ne fait rien, la landing page s'affiche.
    
  }, [user, loading, schoolId, router]);
  
  // Afficher un loader tant que l'état d'authentification n'est pas résolu
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si l'utilisateur est connecté, on affiche un loader pendant la redirection pour éviter un flash de la landing page
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Redirection en cours...</span>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté, afficher la landing page
  return <LandingPageV2 />;
}
