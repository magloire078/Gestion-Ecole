
'use client';

import { Suspense, useMemo } from 'react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';
import { PerformanceChart } from '@/components/performance-chart';
import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, getDocs, collection } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import type { gradeEntry as GradeEntry, cycle as Cycle, student as Student } from '@/lib/data-types';
import { BillingAlerts } from '@/components/billing-alerts';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { ParentStudentCard } from '@/components/parent/student-card';


// ====================================================================================
// Parent Dashboard Component
// ====================================================================================
const ParentDashboard = () => {
    const { user } = useUser();

    if (!user || !user.isParent || !user.schoolId) {
        return null;
    }

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
                    <p className="text-muted-foreground mb-4">Cliquez sur un enfant pour voir ses informations détaillées (notes, paiements, absences, etc.).</p>
                    <div className="space-y-3">
                        {user.parentStudentIds?.map(studentId => (
                           <ParentStudentCard key={studentId} schoolId={user.schoolId!} studentId={studentId} />
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
  
  const studentsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('status', '==', 'Actif')) : null, [firestore, schoolId]);
  const cyclesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`), where('isActive', '==', true)) : null, [firestore, schoolId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  
  const studentCount = useMemo(() => studentsData?.length || 0, [studentsData]);
  const cycleCount = useMemo(() => cyclesData?.length || 0, [cyclesData]);


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

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de Bord</h1>
      </div>
      
      <AnnouncementBanner />

      {schoolId && <BillingAlerts schoolId={schoolId} studentCount={studentCount} cycleCount={cycleCount} />}
    
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
