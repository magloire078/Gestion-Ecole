
'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';
import { PerformanceChart } from '@/components/performance-chart';
import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, getDocs, collection, limit } from 'firebase/firestore';
import { BillingAlerts } from '@/components/billing-alerts';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { ParentStudentCard } from '@/components/parent/student-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { gradeEntry as GradeEntry, cycle as Cycle, student as Student } from '@/lib/data-types';
import { LoadingScreen } from "@/components/ui/loading-screen";

// ====================================================================================
// Custom Hooks for Data Fetching
// ====================================================================================

const useGradesData = (schoolId?: string | null) => {
  const firestore = useFirestore();
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || !firestore) {
      setLoading(false);
      return;
    }

    const fetchGrades = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const gradesCollectionGroup = collectionGroup(firestore, 'notes');
        const gradesQuery = query(
          gradesCollectionGroup,
          where('__name__', '>=', `ecoles/${schoolId}/`),
          where('__name__', '<', `ecoles/${schoolId}￿`),
          limit(500)
        );
        
        const gradesSnapshot = await getDocs(gradesQuery);
        const fetchedGrades: GradeEntry[] = [];
        
        gradesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data && data.subject && typeof data.grade === 'number' && typeof data.coefficient === 'number') {
             fetchedGrades.push({
              ...data,
              id: doc.id,
              date: data.date,
            } as GradeEntry);
          }
        });
        
        setGrades(fetchedGrades);
      } catch (err) {
        console.error("Erreur lors de la récupération des notes:", err);
        setError("Impossible de charger les données des notes");
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [schoolId, firestore]);

  return { grades, loading, error };
};


// ====================================================================================
// Loading Skeletons
// ====================================================================================

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

// ====================================================================================
// Main Page Component
// ====================================================================================

export default function DashboardPageContent() {
    const { user, loading: userLoading } = useUser();
    const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
    const { grades, loading: gradesLoading, error: gradesError } = useGradesData(schoolId);
    
    const firestore = useFirestore();

    const studentsQuery = useMemoFirebase(() => 
        schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), where('status', '==', 'Actif')) : null, 
        [firestore, schoolId]
    );
    const cyclesQuery = useMemoFirebase(() => 
        schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`), where('isActive', '==', true)) : null, 
        [firestore, schoolId]
    );

    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
    const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);

    const studentCount = useMemo(() => studentsData?.length || 0, [studentsData]);
    const cycleCount = useMemo(() => cyclesData?.length || 0, [cyclesData]);

    const isLoading = userLoading || schoolLoading || studentsLoading || cyclesLoading;

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    // Parent View
    if (user?.isParent) {
        if (!user.schoolId || !user.parentStudentIds) {
            return (
                <Alert>
                  <AlertDescription>
                    Session parent invalide. Veuillez vous reconnecter.
                  </AlertDescription>
                </Alert>
            );
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
                        <div className="space-y-4">
                            {user.parentStudentIds.map(studentId => (
                               <ParentStudentCard 
                                 key={studentId} 
                                 schoolId={user.schoolId!} 
                                 studentId={studentId}
                               />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // Regular Staff/Admin View
    if (!schoolId) {
        return (
            <Alert>
              <AlertDescription>
                Aucune école n'est associée à ce compte. Veuillez contacter l'administration.
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
}
