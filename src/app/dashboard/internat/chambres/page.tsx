
'use client';

import { RoomManagement } from '@/components/internat/room-management';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChambresPage() {
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

  return <RoomManagement schoolId={schoolId} />;
}
