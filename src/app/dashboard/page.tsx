
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users, BookOpen, UserPlus, MessageSquare, Check, Milestone } from 'lucide-react';
import { PerformanceChart } from '@/components/performance-chart';
import { useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where, collectionGroup } from 'firebase/firestore';
import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import type { student as Student, message as Message, gradeEntry as GradeEntry, libraryBook as LibraryBook } from '@/lib/data-types';
import { BillingAlerts } from '@/components/billing-alerts';
import { Progress } from '@/components/ui/progress';
import { StatCards } from '@/components/dashboard/stat-cards';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { FinanceOverview } from '@/components/dashboard/finance-overview';

// ====================================================================================
// Onboarding Dashboard Component
// ====================================================================================
interface OnboardingStatus {
  baseInfoDone: boolean;
  structureDone: boolean;
  staffDone: boolean;
  feesDone: boolean;
  classesCount: number;
  teachersCount: number;
  feesCount: number;
  completion: number;
  isSetupComplete: boolean;
}

const OnboardingDashboard = ({ onboardingStatus }: { onboardingStatus: OnboardingStatus }) => {
  const { schoolData } = useSchoolData();

  const StepCard = ({ number, title, description, isDone, href, cta, count, required }: { 
    number: number; 
    title: string; 
    description: string; 
    isDone: boolean; 
    href: string;
    cta: string;
    count?: number;
    required: number;
  }) => (
    <Card className={cn("flex flex-col", isDone && "bg-primary/5 border-primary/20")}>
        <CardHeader>
            <div className="flex items-start gap-4">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {isDone ? <Check className="h-6 w-6" /> : <span className="text-xl font-bold">{number}</span>}
                </div>
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-1">
             {typeof count !== 'undefined' && (
                <div className="text-sm font-medium">
                    {count} / {required} {count > 1 ? 'éléments créés' : 'élément créé'}
                </div>
             )}
        </CardContent>
        <CardFooter>
             <Button className="w-full" variant={isDone ? 'secondary' : 'default'} asChild>
                <Link href={href}>
                   {cta}
                </Link>
            </Button>
        </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Bienvenue à {schoolData?.name || 'votre école'} 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Suivez ces étapes pour finaliser la configuration de votre espace de travail.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">Progression de la configuration</span>
                <span className="text-primary font-bold">{onboardingStatus.completion}%</span>
            </div>
            <Progress value={onboardingStatus.completion} className="h-2"/>
        </CardContent>
      </Card>
      

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StepCard 
          number={1} 
          title="Infos de l'École" 
          description="Nom, logo, adresse..." 
          isDone={onboardingStatus.baseInfoDone}
          href="/dashboard/parametres"
          cta={onboardingStatus.baseInfoDone ? "Vérifier" : "Compléter"}
          required={1}
        />
        <StepCard 
          number={2} 
          title="Structure Scolaire" 
          description="Cycles & niveaux" 
          isDone={onboardingStatus.structureDone}
          href="/dashboard/pedagogie/structure"
          cta={onboardingStatus.structureDone ? "Gérer la structure" : "Définir la structure"}
          count={onboardingStatus.classesCount}
          required={1}
        />
        <StepCard 
          number={3} 
          title="Équipe Pédagogique" 
          description="Ajouter des enseignants" 
          isDone={onboardingStatus.staffDone}
          href="/dashboard/rh"
          cta={onboardingStatus.staffDone ? "Gérer le personnel" : "Ajouter un enseignant"}
          count={onboardingStatus.teachersCount}
          required={1}
        />
        <StepCard 
          number={4} 
          title="Grille Tarifaire" 
          description="Frais de scolarité" 
          isDone={onboardingStatus.feesDone}
          href="/dashboard/frais-scolarite"
          cta={onboardingStatus.feesDone ? "Voir les tarifs" : "Définir les frais"}
          count={onboardingStatus.feesCount}
          required={1}
        />
      </div>

      <div className="mt-8 flex justify-center">
        <Button 
          size="lg"
          onClick={() => window.location.reload()} 
          disabled={!onboardingStatus.isSetupComplete}
        >
          <Milestone className="mr-2 h-5 w-5"/>
          {onboardingStatus.isSetupComplete ? 'Terminer la configuration et accéder au Dashboard' : 'Configuration incomplète'}
        </Button>
      </div>
    </div>
  );
};


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

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de Bord</h1>
      </div>
      
      {schoolId && <BillingAlerts schoolId={schoolId} studentCount={schoolData?.studentsCount || 0} cycleCount={schoolData?.cyclesCount || 0} />}
    
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
  const { schoolData, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
      if (searchParams.get('created')) {
          setIsTransitioning(true);
      }
  }, [searchParams]);

  const calculateOnboardingStatus = useCallback((schoolData: any, classesCount: number, staffCount: number, feesCount: number): OnboardingStatus => {
    const baseInfoDone = !!(schoolData?.name && schoolData?.address);
    const structureDone = classesCount > 0;
    const staffDone = staffCount > 0;
    const feesDone = feesCount > 0;

    let completedSteps = 0;
    if (baseInfoDone) completedSteps++;
    if (structureDone) completedSteps++;
    if (staffDone) completedSteps++;
    if (feesDone) completedSteps++;

    const completion = Math.round((completedSteps / 4) * 100);
    const isSetupComplete = baseInfoDone && structureDone && staffDone && feesDone;

    return {
      baseInfoDone, structureDone, staffDone, feesDone,
      classesCount, teachersCount: staffCount, feesCount,
      completion, isSetupComplete
    };
  }, []);

  useEffect(() => {
    if (schoolLoading || !schoolData?.id || !firestore) {
      if (!schoolLoading && !isTransitioning) {
          setLoading(false);
      }
      return;
    }

    const fetchOnboardingData = async () => {
      try {
        const [classesSnap, staffSnap, feesSnap] = await Promise.all([
          getCountFromServer(query(collection(firestore, `ecoles/${schoolData.id}/classes`))),
          getCountFromServer(query(collection(firestore, `ecoles/${schoolData.id}/personnel`))),
          getCountFromServer(query(collection(firestore, `ecoles/${schoolData.id}/frais_scolarite`))),
        ]);

        const status = calculateOnboardingStatus(
          schoolData,
          classesSnap.data().count,
          staffSnap.data().count,
          feesSnap.data().count
        );
        
        setOnboardingStatus(status);
        
        if(isTransitioning) {
            setIsTransitioning(false);
        }

      } catch (error) {
        console.error('Error fetching onboarding data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();
  }, [schoolData, firestore, schoolLoading, calculateOnboardingStatus, isTransitioning]);

  if (loading || isTransitioning) {
     return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (onboardingStatus && !onboardingStatus.isSetupComplete) {
    return <OnboardingDashboard onboardingStatus={onboardingStatus} />;
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
