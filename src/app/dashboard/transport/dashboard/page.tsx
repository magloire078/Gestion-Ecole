
'use client';

import { LiveTransportTracking } from '@/components/transport/live-tracking';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function TransportDashboardPage() {
  const { schoolId, loading } = useSchoolData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-1 h-96" />
          <Skeleton className="lg:col-span-2 h-96" />
        </div>
      </div>
    );
  }

  if (!schoolId) {
    return <p>ID de l'école non trouvé. Impossible de charger le module de transport.</p>;
  }

  return <LiveTransportTracking schoolId={schoolId} />;
}

