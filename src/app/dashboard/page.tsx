
'use client';

import { Suspense, useState, useMemo, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { computeAcademicYearFromDate } from '@/lib/academic-year-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';
import { CalendarNotes } from '@/components/dashboard/calendar-notes';
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
  <div className="space-y-4 animate-pulse">
    {/* Banner Skeleton */}
    <div className="relative w-full h-44 md:h-60 rounded-xl bg-slate-200/50 border border-slate-300/50 overflow-hidden">
      <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 gap-4">
        <div className="h-4 w-32 bg-slate-300/50 rounded-full" />
        <div className="h-12 md:h-16 w-1/2 bg-slate-300/80 rounded-xl" />
        <div className="h-6 w-1/3 bg-slate-300/50 rounded-xl" />
      </div>
    </div>

    {/* Stat Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 rounded-xl bg-slate-200/50 border border-slate-300/50" />
      ))}
    </div>

    {/* Main Grid Skeleton */}
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 h-96 rounded-xl bg-slate-200/50 border border-slate-300/50" />
      <div className="lg:col-span-1 space-y-6">
        <div className="h-48 rounded-xl bg-slate-200/50 border border-slate-300/50" />
        <div className="h-64 rounded-xl bg-slate-200/50 border border-slate-300/50" />
      </div>
    </div>
  </div>
);


const RegularDashboard = () => {
  const { schoolId, schoolData, isLoading } = useUserSession();

  const [isPending, startTransition] = useTransition();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>(undefined);
  const effectiveAcademicYear = selectedAcademicYear || schoolData?.currentAcademicYear || computeAcademicYearFromDate();

  // Real-time clock and date
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const availableYears = useMemo(() => {
    const baseYear = parseInt(effectiveAcademicYear.split('-')[0], 10) || 2024;
    return [
      `${baseYear - 2}-${baseYear - 1}`,
      `${baseYear - 1}-${baseYear}`,
      `${baseYear}-${baseYear + 1}`,
      `${baseYear + 1}-${baseYear + 2}`
    ];
  }, [effectiveAcademicYear]);

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
    <div className="space-y-4">
      {/* Premium Banner with Mesh Gradient and Glassmorphism */}
      <div className="relative w-full min-h-[170px] md:h-56 overflow-hidden rounded-2xl shadow-2xl border border-white/10 group bg-slate-950">
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0b10] via-[#0f111a] to-[#0a0b10] z-0" />
        <div className="absolute top-0 -left-16 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[120px] opacity-25 animate-blob" />
        <div className="absolute bottom-0 -right-16 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-25 animate-blob animation-delay-2000" />
        
        {/* Glass Content Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col justify-center px-6 md:px-12 py-6 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-[70%] space-y-3"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/90">
                Année en cours : {effectiveAcademicYear}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
              Tableau de <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400">Bord</span>
            </h1>
            
            <p className="text-slate-300 text-sm md:text-base font-semibold max-w-xl leading-relaxed tracking-wide">
              {schoolData?.name || 'Gérez votre établissement avec une excellence technologique.'}
            </p>

            <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{currentTime.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <span className="text-white/20">•</span>
              <div className="tabular-nums font-mono text-indigo-300">
                {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Glassmorphic Logo Container */}
        {schoolData?.mainLogoUrl && (
          <div className="absolute top-1/2 -translate-y-1/2 right-6 md:right-12 z-20 hidden sm:block transition-all duration-300 hover:scale-105">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
              <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden bg-white flex items-center justify-center p-1">
                <SafeImage
                  src={schoolData.mainLogoUrl}
                  alt="Logo École"
                  width={112}
                  height={112}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <div className="w-full md:w-[200px] space-y-1">
          <Select value={effectiveAcademicYear} onValueChange={(val) => startTransition(() => setSelectedAcademicYear(val))}>
            <SelectTrigger className="h-10 bg-white/50 dark:bg-slate-800/50 border-white/60 dark:border-slate-700/60 rounded-xl focus:ring-indigo-500 shadow-sm backdrop-blur-md">
              <Calendar className="mr-2 h-4 w-4 text-indigo-500" />
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <BillingAlerts schoolId={schoolId} studentCount={studentCount} cycleCount={cycleCount} />
      <AnnouncementBanner />
      <StatCards schoolId={schoolId} academicYear={effectiveAcademicYear} />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="shrink-0">
            <FinanceOverview schoolId={schoolId} academicYear={effectiveAcademicYear} />
          </div>
          <div className="flex-1 min-h-[400px]">
            <RecentActivity schoolId={schoolId} />
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="shrink-0">
            <QuickActions />
          </div>
          <div className="shrink-0">
            <ActionItems />
          </div>
          <div className="flex-1 min-h-[400px]">
            <CalendarNotes />
          </div>
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
