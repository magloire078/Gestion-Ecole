
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookUser, School, BookOpen, UserPlus, FileText, CalendarClock, MessageSquare, Check, Plus, CreditCard, Calendar, Activity, Wallet } from 'lucide-react';
import { PerformanceChart } from '@/components/performance-chart';
import { useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where, collectionGroup } from 'firebase/firestore';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { student as Student, message as Message, gradeEntry as GradeEntry, libraryBook as LibraryBook } from '@/lib/data-types';
import { BillingAlerts } from '@/components/billing-alerts';

// ====================================================================================
// TYPES
// ====================================================================================

type ActivityItem = {
  id: string;
  type: 'student' | 'book' | 'message';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: React.ReactNode;
  date: Date;
};

type OnboardingStatus = {
  baseInfoDone: boolean;
  structureDone: boolean;
  staffDone: boolean;
  feesDone: boolean;
  classesCount: number;
  teachersCount: number;
  feesCount: number;
  completion: number;
  isSetupComplete: boolean;
};

// ====================================================================================
// Regular Dashboard Component
// ====================================================================================
const RegularDashboard = () => {
  const firestore = useFirestore();
  const { schoolId } = useSchoolData();

  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    books: 0,
    cycles: 0,
    tuitionPaid: 0,
    tuitionDue: 0,
    totalTuition: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [allGrades, setAllGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !firestore) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch Stats
        const [
          studentsSnapshot,
          teachersSnapshot,
          classesSnapshot,
          booksSnapshot,
          cyclesSnapshot
        ] = await Promise.all([
          getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/eleves`))),
          getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant'))),
          getDocs(query(collection(firestore, `ecoles/${schoolId}/classes`))),
          getDocs(query(collection(firestore, `ecoles/${schoolId}/bibliotheque`))),
          getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/cycles`), where('isActive', '==', true)))
        ]);

        // Calculate books total
        const booksData = booksSnapshot.docs.map(doc => doc.data() as LibraryBook);
        const totalBooks = booksData.reduce((sum, book) => sum + (book.quantity || 0), 0);

        // Calculate tuition
        const studentsQuery = query(collection(firestore, `ecoles/${schoolId}/eleves`));
        const studentsSnapshot2 = await getDocs(studentsQuery);
        const { totalTuition, totalDue } = studentsSnapshot2.docs.reduce((acc, doc) => {
          const student = doc.data() as Student;
          return {
            totalTuition: acc.totalTuition + (student.tuitionFee || 0),
            totalDue: acc.totalDue + (student.amountDue || 0)
          };
        }, { totalTuition: 0, totalDue: 0 });

        setStats({
          students: studentsSnapshot.data().count,
          teachers: teachersSnapshot.data().count,
          classes: classesSnapshot.size,
          cycles: cyclesSnapshot.data().count,
          books: totalBooks,
          tuitionPaid: totalTuition - totalDue,
          tuitionDue: totalDue,
          totalTuition: totalTuition,
        });

        // Fetch Recent Activity
        const [studentsActivitySnapshot, messagesActivitySnapshot, booksActivitySnapshot] = await Promise.all([
          getDocs(query(collection(firestore, `ecoles/${schoolId}/eleves`), orderBy('createdAt', 'desc'), limit(2))),
          getDocs(query(collection(firestore, `ecoles/${schoolId}/messagerie`), orderBy('createdAt', 'desc'), limit(2))),
          getDocs(query(collection(firestore, `ecoles/${schoolId}/bibliotheque`), orderBy('createdAt', 'desc'), limit(2)))
        ]);

        const activities: ActivityItem[] = [];

        studentsActivitySnapshot.forEach(doc => {
          const student = doc.data() as Student;
          const createdAt = (student.createdAt && typeof student.createdAt === 'object' && 'seconds' in student.createdAt) 
            ? new Date((student.createdAt as any).seconds * 1000) 
            : new Date();
          activities.push({
            id: doc.id,
            type: 'student',
            icon: UserPlus,
            color: 'bg-blue-100 dark:bg-blue-900/50',
            description: <>Nouvel élève, <strong>{student.firstName} {student.lastName}</strong>, ajouté.</>,
            date: createdAt,
          });
        });

        messagesActivitySnapshot.forEach(doc => {
          const message = doc.data() as Message;
          const createdAt = (message.createdAt && typeof message.createdAt === 'object' && 'seconds' in message.createdAt) 
            ? new Date((message.createdAt as any).seconds * 1000) 
            : new Date();
          activities.push({
            id: doc.id,
            type: 'message',
            icon: MessageSquare,
            color: 'bg-violet-100 dark:bg-violet-900/50',
            description: <>Nouveau message: <strong>{message.title}</strong> par {message.senderName}.</>,
            date: createdAt,
          });
        });

        booksActivitySnapshot.forEach(doc => {
          const book = doc.data() as LibraryBook;
          const createdAt = (book.createdAt && typeof book.createdAt === 'object' && 'seconds' in book.createdAt) 
            ? new Date((book.createdAt as any).seconds * 1000) 
            : new Date();
          activities.push({
            id: doc.id,
            type: 'book',
            icon: BookOpen,
            color: 'bg-amber-100 dark:bg-amber-900/50',
            description: <>Nouveau livre, <strong>{book.title}</strong>, ajouté à la bibliothèque.</>,
            date: createdAt,
          });
        });

        const sortedActivities = activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
        setRecentActivity(sortedActivities);

        // Fetch Grades for Chart
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
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [schoolId, firestore]);

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('fr-FR')} CFA`;
  };

  const paymentRate = stats.totalTuition > 0 ? (stats.tuitionPaid / stats.totalTuition) * 100 : 0;

  const statsCards = [
    { 
      title: 'Élèves', 
      value: stats.students, 
      icon: Users, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100 dark:bg-blue-900/50', 
      href: '/dashboard/dossiers-eleves' 
    },
    { 
      title: 'Enseignants', 
      value: stats.teachers, 
      icon: BookUser, 
      color: 'text-emerald-600', 
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/50', 
      href: '/dashboard/rh' 
    },
    { 
      title: 'Classes', 
      value: stats.classes, 
      icon: School, 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-100 dark:bg-amber-900/50', 
      href: '/dashboard/pedagogie/structure'
    },
    { 
      title: 'Livres', 
      value: stats.books, 
      icon: BookOpen, 
      color: 'text-violet-600', 
      bgColor: 'bg-violet-100 dark:bg-violet-900/50', 
      href: '/dashboard/bibliotheque' 
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-12 w-12 rounded-xl" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de Bord</h1>
      </div>
      
      {schoolId && <BillingAlerts schoolId={schoolId} studentCount={stats.students} cycleCount={stats.cycles} />}
    
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Link href={stat.href} key={stat.title}>
            <Card className="shadow-sm border-border/50 hover:shadow-md hover:-translate-y-1 transition-transform duration-300 ease-in-out">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={cn("p-3 rounded-xl", stat.bgColor)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mt-2">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PerformanceChart grades={allGrades} loading={false} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity />Activité Récente</CardTitle>
              <CardDescription>Dernières actions au sein de l'école.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center p-2 hover:bg-muted rounded-lg">
                      <div className={cn("p-2 rounded-full mr-4", activity.color)}>
                        <activity.icon className="h-5 w-5 text-current" />
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {`il y a ${formatDistanceToNow(activity.date, { locale: fr, addSuffix: false })}`}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Aucune activité récente à afficher.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet />Statistiques</CardTitle>
              <CardDescription>Vue d'ensemble des finances et plus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cycles Actifs:</span>
                <span className="font-semibold">{stats.cycles}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Dû (scolarité):</span>
                <span className="font-semibold text-destructive">{formatCurrency(stats.tuitionDue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Taux de Paiement:</span>
                <span className="font-semibold text-emerald-600">{paymentRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button variant="outline" asChild className="h-20 flex-col gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <Link href="/dashboard/inscription">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                  <span className="text-xs font-medium">Nouvel Élève</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-20 flex-col gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <Link href="/dashboard/notes">
                  <FileText className="h-6 w-6 text-emerald-600" />
                  <span className="text-xs font-medium">Saisir Notes</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-20 flex-col gap-1 hover:bg-violet-50 dark:hover:bg-violet-900/20">
                <Link href="/dashboard/messagerie">
                  <MessageSquare className="h-6 w-6 text-violet-600" />
                  <span className="text-xs font-medium">Message</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-20 flex-col gap-1 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                <Link href="/dashboard/emploi-du-temps">
                  <CalendarClock className="h-6 w-6 text-amber-600" />
                  <span className="text-xs font-medium">Emploi du temps</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ====================================================================================
// Onboarding Dashboard Component
// ====================================================================================
const OnboardingDashboard = ({ onboardingStatus }: { onboardingStatus: OnboardingStatus }) => {
  const router = useRouter();
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
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${onboardingStatus.completion}%`, transition: 'width 0.5s ease-in-out' }}></div>
            </div>
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
          description="Cycles & classes" 
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
          {onboardingStatus.isSetupComplete ? 'Accéder au tableau de bord' : 'Configuration incomplète'}
        </Button>
      </div>
    </div>
  );
};


// ====================================================================================
// Main Page Component
// ====================================================================================
export default function DashboardPage() {
  const { schoolData, schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const calculateOnboardingStatus = useCallback((schoolData: any, classesCount: number, teachersCount: number, feesCount: number): OnboardingStatus => {
    const baseInfoDone = !!(schoolData?.name && schoolData?.address);
    const structureDone = classesCount > 0;
    const staffDone = teachersCount > 0;
    const feesDone = feesCount > 0;

    let completedSteps = 0;
    if (baseInfoDone) completedSteps++;
    if (structureDone) completedSteps++;
    if (staffDone) completedSteps++;
    if (feesDone) completedSteps++;

    const completion = Math.round((completedSteps / 4) * 100);
    const isSetupComplete = baseInfoDone && structureDone && staffDone && feesDone;

    return {
      baseInfoDone,
      structureDone,
      staffDone,
      feesDone,
      classesCount,
      teachersCount,
      feesCount,
      completion,
      isSetupComplete
    };
  }, []);

  useEffect(() => {
    if (schoolLoading || !schoolId || !firestore) {
      if (!schoolLoading) setLoading(false);
      return;
    }

    const fetchOnboardingData = async () => {
      setLoading(true);
      try {
        const [classesSnap, teachersSnap, feesSnap] = await Promise.all([
          getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/classes`))),
          getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant'))),
          getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/frais_scolarite`))),
        ]);

        const status = calculateOnboardingStatus(
          schoolData,
          classesSnap.data().count,
          teachersSnap.data().count,
          feesSnap.data().count
        );

        setOnboardingStatus(status);
      } catch (error) {
        console.error('Error fetching onboarding data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingData();
  }, [schoolId, firestore, schoolData, schoolLoading, calculateOnboardingStatus]);

  if (loading) {
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

  // Affiche le dashboard normal si le statut n'a pas pu être déterminé ou si la config est complète
  return <RegularDashboard />;
}
