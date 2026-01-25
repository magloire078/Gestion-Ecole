'use client';

import { ActivitesDashboard } from '@/components/activites/dashboard';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function ActivitesDashboardPage() {
  const { schoolId, loading } = useSchoolData();

  if (loading || !schoolId) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <ActivitesDashboard schoolId={schoolId} />;
}
