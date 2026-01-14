
'use client';

import { Suspense } from 'react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';
import { PerformanceChart } from '@/components/performance-chart';
import { useSchoolData } from '@/hooks/use-school-data';
import { useUser } from '@/hooks/use-user';
import { useGradesData } from '@/hooks/use-grades-data';
import { BillingAlerts } from '@/components/billing-alerts';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ParentDashboard } from '@/components/parent/parent-dashboard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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


const RegularDashboard = () => {
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  const { grades, loading: gradesLoading, error: gradesError } = useGradesData(schoolId);
  const studentCount = schoolData?.studentCount || 0;
  const cycleCount = schoolData?.cycles?.length || 0;

  if (schoolLoading) {
    return <DashboardSkeleton />;
  }

  if (!schoolId) {
    return (
        <Alert>
          <AlertDescription className="flex flex-col items-center gap-4 text-center">
            <span>Veuillez sélectionner une école ou en créer une pour accéder au tableau de bord.</span>
             <Button asChild>
                <Link href="/onboarding">Commencer la configuration</Link>
            </Button>
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
          <PerformanceChart grades={grades} loading={gradesLoading} error={gradesError}/>
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


function DashboardPageContent() {
    const { user, loading } = useUser();
    
    if (loading) {
        return <LoadingScreen />;
    }
    
    if (user?.isParent) {
        return <ParentDashboard user={user} />;
    }
    
    return <RegularDashboard />;
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardPageContent />
        </Suspense>
    )
}
