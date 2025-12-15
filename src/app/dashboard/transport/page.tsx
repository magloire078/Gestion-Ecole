
'use client';

import { LiveTransportTracking } from '@/components/transport/live-tracking';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function TransportDashboardPage() {
  const { schoolId, loading } = useSchoolData();

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!schoolId) {
    return <p>ID de l'école non trouvé.</p>;
  }

  return (
    <div className="space-y-6">
       <LiveTransportTracking schoolId={schoolId} />
    </div>
  );
}
