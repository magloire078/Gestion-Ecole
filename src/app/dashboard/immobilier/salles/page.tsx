
'use client';

import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { SalleManagement } from '@/components/immobilier/salle-management';

export default function SallesPage() {
  const { schoolId, loading } = useSchoolData();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!schoolId) {
    return <div>Erreur: ID de l'école non trouvé.</div>;
  }

  return <SalleManagement schoolId={schoolId} />;
}
