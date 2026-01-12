'use client';
import { LandingPageV2 } from '@/components/landing-page-v2';

export default function HomePageContent() {
    // Le contenu de la page d'accueil est maintenant entièrement géré par LandingPageV2
    // pour éviter les conflits d'hydratation liés à la logique d'authentification.
    return <LandingPageV2 />;
}
