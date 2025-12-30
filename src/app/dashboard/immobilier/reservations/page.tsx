
'use client';

import { ReservationsCalendar } from '@/components/reservations/calendar';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReservationsPage() {
  const { schoolId, loading } = useSchoolData();

  if (loading) {
    return <Skeleton className="h-[60vh] w-full" />;
  }

  if (!schoolId) {
    return <p>ID de l'école non trouvé.</p>;
  }

  return (
    <div className="space-y-6">
       <ReservationsCalendar schoolId={schoolId} />
    </div>
  );
}
