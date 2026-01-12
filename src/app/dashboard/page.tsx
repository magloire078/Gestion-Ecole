
'use client';

import dynamic from 'next/dynamic';
import { AuthGuard } from '@/components/auth-guard';
import { LoadingScreen } from '@/components/ui/loading-screen';

// Charger dynamiquement le contenu principal du tableau de bord, y compris sa propre mise en page.
// Cela garantit qu'aucune partie du tableau de bord n'est pré-rendue sur le serveur,
// ce qui est la source principale des erreurs d'hydratation liées à l'authentification.
const DashboardLayoutContentWithAuth = dynamic(
  () => import('@/components/dashboard/dashboard-layout-content-with-auth'),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
);

export default function DashboardPage({
  children,
}: {
  children?: React.ReactNode;
}) {
  // Le composant chargé dynamiquement inclura désormais AuthGuard et DashboardLayoutContent.
  // Nous passons `children` au cas où des routes imbriquées seraient nécessaires à l'avenir.
  return <DashboardLayoutContentWithAuth>{children}</DashboardLayoutContentWithAuth>;
}
