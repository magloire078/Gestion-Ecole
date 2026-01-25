
'use client';

import { DailyMenu } from '@/components/cantine/daily-menu';
import { CantineDashboard } from '@/components/cantine/dashboard';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function CantinePage() {
  const { schoolId, loading } = useSchoolData();

  if (loading || !schoolId) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-96 md:col-span-1" />
                <Skeleton className="h-96 md:col-span-2" />
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <CantineDashboard schoolId={schoolId} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-3">
                 <DailyMenu schoolId={schoolId} />
            </div>
        </div>
    </div>
  );
}
