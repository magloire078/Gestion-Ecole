
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
import { SafeImage } from '@/components/ui/safe-image';


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
      <div className="relative w-full overflow-hidden rounded-2xl shadow-xl group">
        {/* Background image (subtle, overlaid) */}
        <div className="absolute inset-0">
          <SafeImage
            src="/custom-assets/banner.png"
            alt=""
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority={true}
          />
        </div>
        {/* Strong gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-900/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/30" />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-between gap-6 px-6 md:px-10 py-10 md:py-14">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 border border-blue-400/30 backdrop-blur px-3 py-1 text-[10px] font-bold tracking-[0.15em] text-blue-200 uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
              </span>
              Système connecté
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-lg">
              Tableau de <span className="text-blue-400">Bord</span>
            </h1>
            <p className="mt-2 text-base md:text-lg font-medium text-slate-300 drop-shadow">
              {schoolData?.name || 'Gérez votre établissement avec excellence.'}
            </p>
          </div>

          {schoolData?.logoUrl && (
            <div className="hidden md:block shrink-0">
              <div className="relative h-24 w-24 lg:h-28 lg:w-28 rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-2xl bg-white/5 backdrop-blur">
                <SafeImage src={schoolData.logoUrl} alt={schoolData.name || ''} fill className="object-cover" />
              </div>
            </div>
          )}
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
  const { user, isLoading, loadingTimeout, reloadUser } = useUserSession();

  if (isLoading) {
    return (
      <LoadingScreen 
        message="Chargement de votre tableau de bord" 
        showRetry={loadingTimeout} 
        onRetry={reloadUser} 
      />
    );
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
