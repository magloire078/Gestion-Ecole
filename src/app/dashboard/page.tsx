
'use client';

import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookUser, School, BookOpen, UserPlus, FileText, CalendarClock, MessageSquare, DollarSign, AlertCircle, CheckCircle, Plus, CreditCard, Calendar } from 'lucide-react';
import { PerformanceChart } from '@/components/performance-chart';
import { useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where, collectionGroup } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useHydrationFix } from '@/hooks/use-hydration-fix';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { student as Student, message as Message, gradeEntry as GradeEntry, libraryBook as LibraryBook } from '@/lib/data-types';


// ====================================================================================
// TYPES
// ====================================================================================

type Activity = {
  id: string;
  type: 'student' | 'book' | 'message';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: React.ReactNode;
  date: Date;
};

// ====================================================================================
// Regular Dashboard Component
// ====================================================================================
const RegularDashboard = () => {
  const isMounted = useHydrationFix();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  // --- State for Stats Cards ---
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    books: 0,
    tuitionPaid: 0,
    tuitionDue: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // --- Data for Recent Activity ---
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // --- Data for Performance Chart ---
  const [allGrades, setAllGrades] = useState<GradeEntry[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);


  useEffect(() => {
    if (!schoolId || !firestore) {
      if (!schoolLoading) {
        setStatsLoading(false);
        setActivityLoading(false);
        setGradesLoading(false);
      }
      return;
    }

    const fetchAllData = async () => {
      setStatsLoading(true);
      setActivityLoading(true);
      setGradesLoading(true);

      try {
        // --- Fetch Stats ---
        const studentsQuery = query(collection(firestore, `ecoles/${schoolId}/eleves`));
        const teachersQuery = query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant'));
        const classesQuery = query(collection(firestore, `ecoles/${schoolId}/classes`));
        const booksQuery = query(collection(firestore, `ecoles/${schoolId}/bibliotheque`));

        const [studentsSnapshot, teachersSnapshot, classesSnapshot, booksSnapshot, studentsForTuitionSnapshot] = await Promise.all([
            getCountFromServer(studentsQuery),
            getCountFromServer(teachersQuery),
            getCountFromServer(classesQuery),
            getDocs(booksQuery),
            getDocs(studentsQuery)
        ]);

        const totalBooks = booksSnapshot.docs.reduce((sum, doc) => sum + (doc.data() as LibraryBook).quantity, 0);

        const { totalPaid, totalDue } = studentsForTuitionSnapshot.docs.reduce((acc, doc) => {
            const student = doc.data() as Student;
            const tuition = student.tuitionFee || 0;
            const due = student.amountDue || 0;
            acc.totalPaid += (tuition - due);
            acc.totalDue += due;
            return acc;
        }, { totalPaid: 0, totalDue: 0 });

        setStats({
          students: studentsSnapshot.data().count,
          teachers: teachersSnapshot.data().count,
          classes: classesSnapshot.data().count,
          books: totalBooks,
          tuitionPaid: totalPaid,
          tuitionDue: totalDue,
        });
        setStatsLoading(false);


        // --- Fetch Recent Activity ---
        const activities: Activity[] = [];
        
        const recentStudentsQuery = query(collection(firestore, `ecoles/${schoolId}/eleves`), orderBy('createdAt', 'desc'), limit(2));
        const recentMessagesQuery = query(collection(firestore, `ecoles/${schoolId}/messagerie`), orderBy('createdAt', 'desc'), limit(2));
        const recentBooksQuery = query(collection(firestore, `ecoles/${schoolId}/bibliotheque`), orderBy('createdAt', 'desc'), limit(2));

        const [studentsActivitySnapshot, messagesActivitySnapshot, booksActivitySnapshot] = await Promise.all([
          getDocs(recentStudentsQuery), getDocs(recentMessagesQuery), getDocs(recentBooksQuery)
        ]);
        
        studentsActivitySnapshot.forEach(doc => {
            const student = doc.data() as Student;
            const createdAt = (student.createdAt && typeof student.createdAt === 'object' && 'seconds' in student.createdAt) 
                ? new Date((student.createdAt as any).seconds * 1000) 
                : new Date();
            activities.push({
              id: doc.id, type: 'student', icon: UserPlus, color: 'bg-blue-100 dark:bg-blue-900/50',
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
                id: doc.id, type: 'message', icon: MessageSquare, color: 'bg-violet-100 dark:bg-violet-900/50',
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
                id: doc.id, type: 'book', icon: BookOpen, color: 'bg-amber-100 dark:bg-amber-900/50',
                description: <>Nouveau livre, <strong>{book.title}</strong>, ajouté à la bibliothèque.</>,
                date: createdAt,
            });
        });

        const sortedActivities = activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
        setRecentActivity(sortedActivities);
        setActivityLoading(false);

        // --- Fetch Grades for Chart ---
        const gradesCollectionGroup = collectionGroup(firestore, 'notes');
        const gradesQuery = query(gradesCollectionGroup, where('__name__', '>=', `ecoles/${schoolId}/`), where('__name__', '<', `ecoles/${schoolId}0/`));
        const gradesSnapshot = await getDocs(gradesQuery);
        const fetchedGrades: GradeEntry[] = [];
        gradesSnapshot.forEach(doc => {
            fetchedGrades.push(doc.data() as GradeEntry);
        });
        setAllGrades(fetchedGrades);
        setGradesLoading(false);


      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setStatsLoading(false);
        setActivityLoading(false);
        setGradesLoading(false);
      }
    };
    
    fetchAllData();
  }, [schoolId, firestore, schoolLoading]);

  const formatCurrency = (value: number) => {
    if (value > 1000000) {
      return `${(value / 1000000).toFixed(1)}M CFA`;
    }
    if (value > 1000) {
      return `${Math.round(value / 1000)}K CFA`;
    }
    return `${value} CFA`;
  }

  const statsCards = [
    { 
      title: 'Élèves', 
      value: stats.students, 
      icon: Users, 
      loading: statsLoading, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-100 dark:bg-blue-900/50', 
      href: '/dashboard/dossiers-eleves' 
    },
    { 
      title: 'Enseignants', 
      value: stats.teachers, 
      icon: BookUser, 
      loading: statsLoading, 
      color: 'text-emerald-600', 
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/50', 
      href: '/dashboard/rh' 
    },
    { 
      title: 'Classes', 
      value: stats.classes, 
      icon: School, 
      loading: statsLoading, 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-100 dark:bg-amber-900/50', 
      href: '/dashboard/pedagogie/structure'
    },
    { 
      title: 'Livres', 
      value: stats.books, 
      icon: BookOpen, 
      loading: statsLoading, 
      color: 'text-violet-600', 
      bgColor: 'bg-violet-100 dark:bg-violet-900/50', 
      href: '/dashboard/bibliotheque' 
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de Bord</h1>
      </div>
      <AnnouncementBanner />
    
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
                {stat.loading ? (
                  <Skeleton className="h-8 w-1/2 mt-2" />
                ) : (
                  <div className="text-3xl font-bold mt-2">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PerformanceChart grades={allGrades} loading={gradesLoading} />

          <Card>
            <CardHeader>
              <CardTitle>Activité Récente</CardTitle>
              <CardDescription>Dernières actions au sein de l'école.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center p-2 hover:bg-muted rounded-lg">
                      <div className={cn("p-2 rounded-full mr-4", activity.color)}>
                        <activity.icon className="h-5 w-5 text-current" />
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {isMounted ? `il y a ${formatDistanceToNow(activity.date, { locale: fr, addSuffix: false })}` : '...'}
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
              <CardTitle>Finances Scolarité</CardTitle>
              <CardDescription>Vue d'ensemble des frais de scolarité.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-800/50 mr-4">
                  <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm text-emerald-800 dark:text-emerald-400">Total Versé</p>
                  {statsLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold text-emerald-700 dark:text-emerald-200">{formatCurrency(stats.tuitionPaid)}</p>}
                </div>
              </div>
              <div className="flex items-center p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-800/50 mr-4">
                  <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                </div>
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-400">Total Dû</p>
                  {statsLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold text-amber-700 dark:text-amber-200">{formatCurrency(stats.tuitionDue)}</p>}
                </div>
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
}

// ====================================================================================
// Onboarding Dashboard Component
// ====================================================================================
const OnboardingDashboard = () => {
  const { schoolData, loading } = useSchoolData();
  const router = useRouter();

  const completion = useMemo(() => {
    if (!schoolData) return 0;
    let completed = 0;
    const total = 4;
    if (schoolData.name) completed++;
    if (schoolData.directorFirstName && schoolData.directorLastName) completed++;
    if (schoolData.mainLogoUrl) completed++;
    if (schoolData.address) completed++;
    return Math.round((completed / total) * 100);
  }, [schoolData]);

  if (loading) {
    return <Skeleton className="h-screen w-full" />
  }

  const QuickActionCard = ({ icon, title, description, color, href }: { icon: React.ReactNode, title: string, description: string, color: string, href: string }) => (
    <Link href={href} className="block">
        <Card className="p-4 h-full hover:shadow-lg transition-shadow hover:-translate-y-1">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", 
            color === 'blue' && 'bg-blue-100 text-blue-600 dark:bg-blue-900/50',
            color === 'green' && 'bg-green-100 text-green-600 dark:bg-green-900/50',
            color === 'purple' && 'bg-purple-100 text-purple-600 dark:bg-purple-900/50',
            color === 'orange' && 'bg-orange-100 text-orange-600 dark:bg-orange-900/50'
          )}>
            {icon}
          </div>
          <h4 className="font-bold">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6 dark:from-gray-900 dark:to-gray-800">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Bienvenue à {schoolData?.name || 'votre école'} 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Complétez la configuration de votre école pour commencer.
        </p>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm mb-8">
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="font-medium">Configuration de l'école</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{completion}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600" style={{ width: `${completion}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 shadow-sm border-2 border-primary">
          <div className="flex items-start mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mr-4">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">1</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold">Informations de base</h3>
              <p className="text-muted-foreground text-sm">Configuration essentielle</p>
            </div>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center text-green-600"><CheckCircle className="w-5 h-5 mr-2" /><span>Nom de l'école</span></div>
            <div className="flex items-center text-green-600"><CheckCircle className="w-5 h-5 mr-2" /><span>Directeur désigné</span></div>
            <div className={cn("flex items-center", schoolData?.mainLogoUrl ? 'text-green-600' : 'text-yellow-600')}><CheckCircle className="w-5 h-5 mr-2" /><span>Logo de l'école</span></div>
            <div className={cn("flex items-center", schoolData?.address ? 'text-green-600' : 'text-yellow-600')}><AlertCircle className="w-5 h-5 mr-2" /><span>Adresse complète</span></div>
          </div>
          
          <Button className="mt-6 w-full" onClick={() => router.push('/dashboard/parametres')}>
            Compléter les informations
          </Button>
        </Card>

        <Card className="p-6 shadow-sm">
          <div className="flex items-start mb-4">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mr-4">
              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">2</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold">Structure scolaire</h3>
              <p className="text-muted-foreground text-sm">Cycles, classes et matières</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Définissez l'organisation pédagogique de votre établissement.
          </p>
          <Button className="w-full" variant="outline" onClick={() => router.push('/dashboard/pedagogie/structure')}>
            <Plus className="w-5 h-5 inline mr-2" />
            Configurer la structure
          </Button>
        </Card>

        <Card className="p-6 shadow-sm">
          <div className="flex items-start mb-4">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mr-4">
              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">3</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold">Équipe pédagogique</h3>
              <p className="text-muted-foreground text-sm">Ajouter les enseignants</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Commencez à construire votre équipe pour assigner les classes.
          </p>
          <Button className="w-full" variant="outline" onClick={() => router.push('/dashboard/rh')}>
            <Plus className="w-5 h-5 inline mr-2" />
            Ajouter un enseignant
          </Button>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-6 border border-blue-100 dark:border-blue-900">
          <h3 className="text-xl font-bold mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionCard icon={<UserPlus />} title="Inscrire un élève" description="Via le formulaire complet" color="blue" href="/dashboard/inscription"/>
            <QuickActionCard icon={<Calendar />} title="Créer une classe" description="Définir niveaux et frais" color="green" href="/dashboard/pedagogie/structure/new"/>
            <QuickActionCard icon={<CreditCard />} title="Encaisser un paiement" description="Suivi de la scolarité" color="purple" href="/dashboard/paiements"/>
            <QuickActionCard icon={<BookOpen />} title="Ajouter des livres" description="Gestion de la bibliothèque" color="orange" href="/dashboard/bibliotheque"/>
          </div>
        </Card>
      </div>

      <div className="mt-8 flex justify-end">
        <Button className="px-6 py-3" onClick={() => window.location.reload()}>
          J'ai terminé la configuration
        </Button>
      </div>
    </div>
  );
};

// ====================================================================================
// Main Page Component
// ====================================================================================
export default function DashboardPage() {
  const { schoolData, loading } = useSchoolData();
  const isMounted = useHydrationFix();

  const isSetupComplete = useMemo(() => {
    if (!schoolData) return false;
    return !!schoolData.address && !!schoolData.mainLogoUrl;
  }, [schoolData]);

  if (!isMounted || loading) {
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

  if (!isSetupComplete) {
    return <OnboardingDashboard />;
  }
  
  return <RegularDashboard />;
}

    