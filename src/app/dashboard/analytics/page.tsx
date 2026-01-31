
'use client';

import { useSchoolData } from '@/hooks/use-school-data';
import { useUser } from '@/hooks/use-user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock } from 'lucide-react';
import { StudentDemographics } from '@/components/analytics/student-demographics';
import { AttendanceAnalytics } from '@/components/analytics/attendance-analytics';
import { TuitionAnalytics } from '@/components/analytics/tuition-analytics';
import { PerformanceChart } from '@/components/performance-chart';
import { useGradesData } from '@/hooks/use-grades-data';

function AnalyticsPageContent() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { user, loading: userLoading } = useUser();

  const canViewAnalytics = !!user?.profile?.permissions?.viewAnalytics;

  const { grades, loading: gradesLoading, error: gradesError } = useGradesData(canViewAnalytics ? schoolId : null);

  const isLoading = schoolLoading || userLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80 lg:col-span-2" />
      </div>
    );
  }

  if (!canViewAnalytics) {
    return (
      <Card className="flex flex-col items-center justify-center h-96">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="h-6 w-6 text-destructive" />
            Accès Restreint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Vous n'avez pas la permission de consulter les statistiques et analyses.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!schoolId) {
    return <p>Veuillez sélectionner une école.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudentDemographics schoolId={schoolId} />
        <AttendanceAnalytics schoolId={schoolId} />
      </div>
      <TuitionAnalytics schoolId={schoolId} />
      <PerformanceChart grades={grades} loading={gradesLoading} error={gradesError} />
    </div>
  );
}


export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Statistiques & Analyses</h1>
                <p className="text-muted-foreground">
                    Explorez les données clés de votre établissement pour prendre des décisions éclairées.
                </p>
            </div>
            <AnalyticsPageContent />
        </div>
    )
}
