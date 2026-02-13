
'use client';

import { Suspense } from 'react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';
import { useUserSession } from '@/hooks/use-user-session';
import { BillingAlerts } from '@/components/billing-alerts';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ParentDashboard } from '@/components/parent/parent-dashboard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ActionItems } from '@/components/dashboard/action-items';


const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-24 w-full" />
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
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
  const { schoolId, schoolData, isLoading } = useUserSession();

  const studentCount = schoolData?.studentCount || 0;
  const cycleCount = schoolData?.cycles?.length || 0;

  if (isLoading) {
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
      <div className="relative w-full h-40 md:h-52 overflow-hidden rounded-2xl shadow-lg group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-indigo-900/40 z-10" />
        <img
          src="/custom-assets/banner.png"
          alt="Tableau de bord"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 md:px-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow-md">
            Tableau de Bord
          </h1>
          <p className="text-blue-100 text-lg font-medium max-w-xl drop-shadow-sm">
            {schoolData?.name || 'Gérez votre établissement avec excellence.'}
          </p>
        </div>
      </div>

      <BillingAlerts schoolId={schoolId} studentCount={studentCount} cycleCount={cycleCount} />
      <AnnouncementBanner />
      <StatCards schoolId={schoolId} />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <RecentActivity schoolId={schoolId} />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <ActionItems />
          <FinanceOverview schoolId={schoolId} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
};


function DashboardPageContent() {
  const { user, isLoading } = useUserSession();

  if (isLoading) {
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
