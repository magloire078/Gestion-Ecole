'use client';

import { Suspense, useMemo } from 'react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';
import { PerformanceChart } from '@/components/performance-chart';
import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useGradesData } from '@/hooks/use-grades-data';
import { BillingAlerts } from '@/components/billing-alerts';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { ParentStudentCard } from '@/components/parent/student-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingScreen } from '@/components/ui/loading-screen';

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

const ParentDashboard = () => {
    const { user } = useUser();

    if (!user || !user.isParent || !user.schoolId) {
        return null;
    }

    return (
        <div className="space-y-6">
             <h1 className="text-2xl font-bold">Portail Parent</h1>
            <AnnouncementBanner />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Mes Enfants</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Cliquez sur un enfant pour voir ses informations détaillées.</p>
                    <div className="space-y-3">
                        {(user.parentStudentIds || []).map(studentId => (
                           <ParentStudentCard key={studentId} schoolId={user.schoolId!} studentId={studentId} />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

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
          <PerformanceChart grades={grades} loading={gradesLoading}/>
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
        return <ParentDashboard />;
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