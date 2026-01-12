
'use client';

import { AuthGuard } from "@/components/auth-guard";
import DashboardLayoutContent from "@/app/dashboard/dashboard-layout-content";
import DashboardPageContent from "@/components/dashboard-content";

// Ce composant est maintenant le point d'entrée sécurisé pour le tableau de bord.
// Il garantit que l'authentification est vérifiée avant de tenter de rendre la mise en page
// et le contenu du tableau de bord.
function SecuredDashboard() {
  return (
    <AuthGuard>
      <DashboardLayoutContent>
        <DashboardPageContent />
      </DashboardLayoutContent>
    </AuthGuard>
  );
}

export default SecuredDashboard;
