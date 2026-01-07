
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
import { Users, Loader2 } from 'lucide-react';
import { ParentStudentCard } from '@/components/parent/student-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import type { gradeEntry as GradeEntry, cycle as Cycle, student as Student } from '@/lib/data-types';

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
// Parent Dashboard Component
// ====================================================================================
interface ParentDashboardState {
    studentIds: string[];
    schoolId: string;
}

const ParentDashboard = ({ session }: { session: ParentDashboardState }) => {
    if (!session.schoolId) {
      return (
        <Alert>
          <AlertDescription>
            Session parent invalide. Veuillez vous reconnecter.
          </AlertDescription>
        </Alert>
      );
    }

    if (session.studentIds.length === 0) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Portail Parent</h1>
          <AnnouncementBanner />
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Aucun élève n'est associé à votre session. Veuillez contacter l'administration.
              </p>
            </CardContent>
          </Card>
        </div>
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
                        {session.studentIds.map(studentId => (
                           <ParentStudentCard 
                             key={studentId} 
                             schoolId={session.schoolId!} 
                             studentId={studentId}
                           />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// ====================================================================================
// Regular Dashboard Component
// ====================================================================================
const RegularDashboard = () => {
  const firestore = useFirestore();
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  const { grades: allGrades, loading: gradesLoading, error: gradesError } = useGradesData(schoolId);
  
  const studentsQuery = useMemoFirebase(() => 
    schoolId ? query(
      collection(firestore, `ecoles/${schoolId}/eleves`), 
      where('status', '==', 'Actif'),
      limit(2000)
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

// ====================================================================================
// Main Page Component
// ====================================================================================
function DashboardPageContent() {
    const { user, loading: userLoading } = useUser();
    const [parentSession, setParentSession] = useState<ParentDashboardState | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient && !user) { // Only check for parent session if not a regular user
            const sessionId = localStorage.getItem('parent_session_id');
            const schoolId = localStorage.getItem('parent_school_id');
            const studentIdsStr = localStorage.getItem('parent_student_ids');
            if (sessionId && schoolId && studentIdsStr) {
                try {
                    const studentIds = JSON.parse(studentIdsStr);
                    setParentSession({ studentIds, schoolId });
                } catch (e) {
                    console.error("Failed to parse parent session data from localStorage", e);
                }
            }
        }
    }, [isClient, user]);

    if (userLoading || !isClient) {
        return <DashboardSkeleton />;
    }

    if (parentSession) {
        return <ParentDashboard session={parentSession} />;
    }

    if (user) {
        return <RegularDashboard />;
    }

    // Default to skeleton if no session is found yet but client is ready
    return <DashboardSkeleton />;
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardPageContent />
        </Suspense>
    );
}
