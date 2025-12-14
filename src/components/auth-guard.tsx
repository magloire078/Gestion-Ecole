
'use client';

import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { usePathname } from 'next/navigation';

function AuthProtectionLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-semibold">Chargement de votre espace...</p>
        <p className="text-muted-foreground">Vérification de vos accès.</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading: userLoading } = useUser();
  const { loading: schoolLoading } = useSchoolData();
  const pathname = usePathname();
  
  // Affiche un loader uniquement pendant le chargement initial de l'utilisateur ou de l'école.
  // Ne gère plus les redirections, ce rôle est délégué au layout.
  if (userLoading || schoolLoading) {
      // Les pages d'authentification ou publiques ne doivent pas montrer ce loader.
      if (pathname === '/login' || pathname.startsWith('/public') || pathname === '/') {
        return <>{children}</>;
      }
      return <AuthProtectionLoader />;
  }
  
  // Une fois le chargement terminé, on rend les enfants.
  // Le layout parent (ex: DashboardLayout) se chargera de la logique de redirection.
  return <>{children}</>;
}
