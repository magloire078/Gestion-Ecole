
'use client';

import { useMemo } from 'react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';
import { PerformanceChart } from '@/components/performance-chart';
import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { BillingAlerts } from '@/components/billing-alerts';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useGradesData } from '@/hooks/use-grades-data';

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-24 w-full" />
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="lg:col-span-1 space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  </div>
);


export const RegularDashboard = () => {
  const firestore = useFirestore();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  
  const { grades, loading: gradesLoading, error: gradesError } = useGradesData(schoolId);
  
  const studentsQuery = useMemoFirebase(() => 
    schoolId ? query(
      collection(firestore, `ecoles/${schoolId}/eleves`), 
      where('status', '==', 'Actif')
    ) : null, 
    [firestore, schoolId]
  );
  
  const cyclesQuery = useMemoFirebase(() => 
    schoolId ? query(
      collection(firestore, `ecoles/${schoolId}/cycles`), 
      where('isActive', '==', true)
    ) : null, 
    [firestore, schoolId]
  );
  
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  
  const studentCount = useMemo(() => studentsData?.length || 0, [studentsData]);
  const cycleCount = useMemo(() => cyclesData?.length || 0, [cyclesData]);
  const allGrades = grades;

  if (schoolLoading || studentsLoading || cyclesLoading) {
    return <DashboardSkeleton />;
  }

  if (!schoolId) {
    return (
        <Alert>
          <AlertDescription>
            Veuillez sélectionner une école ou en créer une pour accéder au tableau de bord.
          </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
          Tableau de Bord {schoolData?.name ? `- ${schoolData.name}` : ''}
      </h1>
      <AnnouncementBanner />
      <BillingAlerts schoolId={schoolId} studentCount={studentCount} cycleCount={cycleCount} />
      <StatCards schoolId={schoolId} />
      {gradesError && <Alert variant="destructive"><AlertDescription>{gradesError}</AlertDescription></Alert>}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PerformanceChart grades={allGrades} loading={gradesLoading}/>
          <RecentActivity schoolId={schoolId} />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <FinanceOverview schoolId={schoolId} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
};
