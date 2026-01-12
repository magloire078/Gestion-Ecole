
'use client';

import { AuthGuard } from "@/components/auth-guard";
import DashboardLayoutContent from "@/app/dashboard/dashboard-layout-content";
import DashboardPageContent from "@/components/dashboard-content";

// Ce nouveau composant combine l'AuthGuard, la mise en page du tableau de bord,
// et le contenu de la page principale du tableau de bord.
// Il est destiné à être importé dynamiquement avec ssr: false.
export default function DashboardLayoutContentWithAuth({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
      <AuthGuard>
          <DashboardLayoutContent>
              {/* Si des enfants sont passés (par ex. pour une future route imbriquée), on les affiche.
                  Sinon, on affiche le contenu par défaut du tableau de bord. */}
              {children || <DashboardPageContent />}
          </DashboardLayoutContent>
      </AuthGuard>
  );
}
