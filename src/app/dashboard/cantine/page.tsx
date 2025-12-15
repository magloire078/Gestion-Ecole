
'use client';

import { DailyMenu } from '@/components/cantine/daily-menu';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function CantinePage() {
  const { schoolId, loading } = useSchoolData();

  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-64 md:col-span-1" />
                <Skeleton className="h-96 md:col-span-2" />
            </div>
        </div>
    );
  }

  if (!schoolId) {
    return <div>Erreur : ID de l'école non trouvé.</div>;
  }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-lg font-semibold md:text-2xl">Gestion de la Cantine</h1>
            <p className="text-muted-foreground">
                Consultez les menus, gérez les réservations et les abonnements.
            </p>
        </div>
        <DailyMenu schoolId={schoolId} />
    </div>
  );
}

    