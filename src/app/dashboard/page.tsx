
'use client';

import { Suspense, useMemo } from 'react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';
import { PerformanceChart } from '@/components/performance-chart';
import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore, useUser } from '@/firebase';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import type { gradeEntry as GradeEntry } from '@/lib/data-types';
import { BillingAlerts } from '@/components/billing-alerts';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import Link from 'next/link';


// ====================================================================================
// Parent Dashboard Component
// ====================================================================================
const ParentDashboard = () => {
    const { user } = useUser();

    return (
        <div className="space-y-6">
             <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portail Parent</h1>
            </div>
            <AnnouncementBanner />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Mes Enfants</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Cliquez sur le nom d'un enfant pour voir ses informations détaillées.</p>
                    <div className="space-y-2">
                        {user?.parentStudentIds?.map(studentId => (
                            <Link key={studentId} href={`/dashboard/dossiers-eleves/${studentId}`} className="block p-3 rounded-md hover:bg-muted">
                                Élève ID: {studentId}
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}


// ====================================================================================
// Regular Dashboard Component
// ====================================================================================
const RegularDashboard = () => {
  const firestore = useFirestore();
  const { schoolId, schoolData } = useSchoolData();
  const [allGrades, setAllGrades] = useState<GradeEntry[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);

  // Isolate grade fetching
  useEffect(() => {
    if (!schoolId || !firestore) return;

    const fetchGrades = async () => {
      setGradesLoading(true);
      try {
        const gradesCollectionGroup = collectionGroup(firestore, 'notes');
        const gradesQuery = query(
          gradesCollectionGroup,
          where('__name__', '>=', `ecoles/${schoolId}/`),
          where('__name__', '<', `ecoles/${schoolId}0/`)
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        const fetchedGrades: GradeEntry[] = gradesSnapshot.docs.map(doc => doc.data() as GradeEntry);
        setAllGrades(fetchedGrades);
      } catch (error) {
        console.error("Error fetching grades data:", error);
      } finally {
        setGradesLoading(false);
      }
    };

    fetchGrades();
  }, [schoolId, firestore]);
  
  const studentCount = useMemo(() => {
    // This is a placeholder, a real implementation might get this from schoolData or a separate query
    return schoolData?.studentCount || 0;
  }, [schoolData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de Bord</h1>
      </div>
      
      <AnnouncementBanner />

      {schoolId && <BillingAlerts schoolId={schoolId} studentCount={studentCount} cycleCount={schoolData?.cycles?.length || 0} />}
    
      <StatCards schoolId={schoolId!} />
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PerformanceChart grades={allGrades} loading={gradesLoading} />
          <RecentActivity schoolId={schoolId!} />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <FinanceOverview schoolId={schoolId!} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
};


// ====================================================================================
// Main Page Component
// ====================================================================================
function DashboardPageContent() {
    const { user } = useUser();
    
    if (user?.isParent) {
        return <ParentDashboard />;
    }

    return <RegularDashboard />;
}

export default function DashboardPage() {
    return (
        <Suspense>
            <DashboardPageContent />
        </Suspense>
    )
}
