
'use client';

import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  <div className="space-y-8 animate-pulse">
    {/* Banner Skeleton */}
    <div className="relative w-full h-44 md:h-60 rounded-[2.5rem] bg-white/5 border border-white/10 overflow-hidden">
      <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 gap-4">
        <div className="h-4 w-32 bg-white/10 rounded-full" />
        <div className="h-12 md:h-16 w-1/2 bg-white/10 rounded-2xl" />
        <div className="h-6 w-1/3 bg-white/5 rounded-xl" />
      </div>
    </div>

    {/* Stat Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 rounded-3xl bg-white/5 border border-white/10" />
      ))}
    </div>

    {/* Main Grid Skeleton */}
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 h-96 rounded-3xl bg-white/5 border border-white/10" />
      <div className="lg:col-span-1 space-y-6">
        <div className="h-48 rounded-3xl bg-white/5 border border-white/10" />
        <div className="h-64 rounded-3xl bg-white/5 border border-white/10" />
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
    <div className="space-y-8">
      {/* Premium Banner with Mesh Gradient and Glassmorphism */}
      <div className="relative w-full h-44 md:h-60 overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/10 group">
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 bg-[#0a0a0b]" />
        <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent animate-[spin_30s_linear_infinite]" />
        
        {/* Glass Content Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col justify-center px-8 md:px-16 backdrop-blur-[1px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200/80">Système Connecté</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-3 drop-shadow-2xl">
              Tableau de <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">Bord</span>
            </h1>
            <p className="text-blue-100/70 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
              {schoolData?.name || 'Gérez votre établissement avec une excellence technologique.'}
            </p>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 p-8 z-20 hidden md:block opacity-20 group-hover:opacity-40 transition-opacity">
          <SafeImage
            src={schoolData?.mainLogoUrl || "/custom-assets/banner.png"}
            alt="School Logo"
            width={120}
            height={120}
            className="rounded-2xl filter grayscale invert brightness-200"
          />
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
