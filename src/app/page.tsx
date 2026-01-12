import dynamic from 'next/dynamic';
import { LoadingScreen } from '@/components/ui/loading-screen';

// Désactiver complètement le SSR pour la page d'accueil
const HomePageClient = dynamic(
  () => import('./home-page-content'),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
);

export default function HomePage() {
  return <HomePageClient />;
}
    