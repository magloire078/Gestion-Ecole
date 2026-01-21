'use client';

import { StudentDemographics } from '@/components/analytics/student-demographics';
import { TuitionAnalytics } from '@/components/analytics/tuition-analytics';
import { AttendanceAnalytics } from '@/components/analytics/attendance-analytics';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsPage() {
  const { schoolId, loading } = useSchoolData();

  if (loading || !schoolId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold">Statistiques & Rapports</h1>
        <p className="text-muted-foreground">
          Analysez les données clés de votre établissement pour prendre des décisions éclairées.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudentDemographics schoolId={schoolId} />
        <AttendanceAnalytics schoolId={schoolId} />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <TuitionAnalytics schoolId={schoolId} />
      </div>
    </div>
  );
}
