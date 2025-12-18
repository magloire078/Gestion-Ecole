'use client';

import { InternatDashboard } from '@/components/internat/dashboard';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function InternatDashboardPage() {
  const { schoolId, loading } = useSchoolData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!schoolId) {
    return <div>Erreur : ID de l'école non trouvé.</div>;
  }

  return (
    <div className="space-y-6">
       <InternatDashboard schoolId={schoolId} />
    </div>
  );
}
