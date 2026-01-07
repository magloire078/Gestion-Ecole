
'use client';

import { Suspense, useMemo } from 'react';
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';
import { PerformanceChart } from '@/components/performance-chart';
import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, getDocs, collection, limit } from 'firebase/firestore';
import { useState, useEffect, useCallback } from 'react';
import type { gradeEntry as GradeEntry, cycle as Cycle, student as Student } from '@/lib/data-types';
import { BillingAlerts } from '@/components/billing-alerts';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ParentStudentCard } from '@/components/parent/student-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

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

const ParentDashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-24 w-full" />
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
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
          where('__name__', '<', `ecoles/${schoolId}\uf8ff`),
          limit(500) // Limiter pour le dashboard
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
const ParentDashboard = () => {
    const { user, loading: userLoading } = useUser();

    if (userLoading) {
      return <ParentDashboardSkeleton />;
    }

    if (!user || !user.isParent || !user.schoolId) {
      return (
        <Alert>
          <AlertDescription>
            Vous n'avez pas accès au tableau de bord parent. Veuillez contacter l'administration de l'école.
          </AlertDescription>
        </Alert>
      );
    }

    const studentIds = user.parentStudentIds || [];

    if (studentIds.length === 0) {
      return (
        <div className="space-y-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portail Parent</h1>
          </div>
          <AnnouncementBanner />
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Aucun élève n'est associé à votre compte parent.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portail Parent</h1>
                <div className="text-sm text-muted-foreground">
                  {studentIds.length} {studentIds.length > 1 ? 'enfants' : 'enfant'}
                </div>
            </div>
            
            <AnnouncementBanner />
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" /> 
                      Mes Enfants
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Cliquez sur un enfant pour voir ses informations détaillées (notes, paiements, absences, etc.).
                    </p>
                    
                    <div className="space-y-4">
                        {studentIds.map((studentId, index) => (
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
      limit(2000) // Limiter pour éviter des charges inutiles sur le dashboard
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

  // Afficher le skeleton pendant le chargement
  if (schoolLoading || studentsLoading || cyclesLoading) {
    return <DashboardSkeleton />;
  }

  // Si pas d'école sélectionnée
  if (!schoolId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de Bord</h1>
        </div>
        
        <Alert>
          <AlertDescription>
            Veuillez sélectionner une école pour accéder au tableau de bord.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Tableau de Bord {schoolData?.name ? `- ${schoolData.name}` : ''}
        </h1>
        <div className="text-sm text-muted-foreground">
          {studentCount} élèves • {cycleCount} cycles actifs
        </div>
      </div>
      
      <AnnouncementBanner />

      {schoolId && (
        <BillingAlerts 
          schoolId={schoolId} 
          studentCount={studentCount} 
          cycleCount={cycleCount} 
        />
      )}
    
      <StatCards schoolId={schoolId} />
      
      {gradesError && (
        <Alert variant="destructive">
          <AlertDescription>
            {gradesError}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PerformanceChart 
            grades={allGrades} 
            loading={gradesLoading}
          />
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
    
    if (userLoading) {
      return <DashboardSkeleton />;
    }

    if (user?.isParent) {
        return <ParentDashboard />;
    }

    return <RegularDashboard />;
}

export default function DashboardPage() {
    return (
        <Suspense 
          fallback={
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
            <DashboardPageContent />
        </Suspense>
    );
}
