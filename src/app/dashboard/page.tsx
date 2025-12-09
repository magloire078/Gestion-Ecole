
'use client';

import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookUser, BookOpen, Landmark, UserPlus, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { PerformanceChart } from '@/components/performance-chart';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection, query, orderBy, limit, getDocs, collectionGroup } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { accountingTransaction as AccountingTransaction, libraryBook as Book, student as Student, gradeEntry as GradeEntry } from '@/lib/data-types';
import { useHydrationFix } from '@/hooks/use-hydration-fix';
import { AccountingCharts } from './comptabilite/charts';
import { sum } from 'd3-array';

type Activity = {
    id: string;
    type: 'student' | 'book';
    icon: React.ComponentType<{ className?: string }>;
    description: React.ReactNode;
    date: Date;
};

export default function DashboardPage() {
  const isMounted = useHydrationFix();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  // --- Data for Stats Cards ---
  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/enseignants`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const libraryQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/bibliotheque`) : null, [firestore, schoolId]);
  const transactionsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/comptabilite`)) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: libraryData, loading: libraryLoading } = useCollection(libraryQuery);
  const { data: transactionsData, loading: transactionsLoading } = useCollection(transactionsQuery);

  
  const books: Book[] = useMemo(() => libraryData?.map(d => ({ id: d.id, ...d.data() } as Book)) || [], [libraryData]);
  const transactions: AccountingTransaction[] = useMemo(() => transactionsData?.map(d => ({ id: d.id, ...d.data() } as AccountingTransaction)) || [], [transactionsData]);

  // --- Data for Performance Chart ---
  const [allGrades, setAllGrades] = useState<GradeEntry[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);

  useEffect(() => {
    async function fetchAllGrades() {
      if (!schoolId || !firestore) {
        setAllGrades([]);
        setGradesLoading(false);
        return;
      }
      
      setGradesLoading(true);
      
      const gradesQuery = query(collectionGroup(firestore, 'notes'));

      try {
        const querySnapshot = await getDocs(gradesQuery);
        const grades = querySnapshot.docs.filter(doc => doc.ref.path.startsWith(`ecoles/${schoolId}/`)).map(doc => doc.data() as GradeEntry);
        setAllGrades(grades);
      } catch (error) {
        console.error("Erreur lors de la récupération des notes (collection group):", error);
        setAllGrades([]);
      } finally {
        setGradesLoading(false);
      }
    }
    
    fetchAllGrades();

  }, [schoolId, firestore]);


  // --- Data for Recent Activity ---
  const recentStudentsQuery = useMemoFirebase(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), orderBy('createdAt', 'desc'), limit(5)) : null
  , [firestore, schoolId]);
  const recentBooksQuery = useMemoFirebase(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/bibliotheque`), orderBy('createdAt', 'desc'), limit(5)) : null
  , [firestore, schoolId]);

  const { data: recentStudentsData, loading: recentStudentsLoading } = useCollection(recentStudentsQuery);
  const { data: recentBooksData, loading: recentBooksLoading } = useCollection(recentBooksQuery);
  
  const recentActivity = useMemo(() => {
    const activities: Activity[] = [];

    recentStudentsData?.forEach(doc => {
        const student = doc.data() as Student;
        const createdAt = student.createdAt ? new Date(student.createdAt.seconds * 1000) : new Date();
        activities.push({
            id: doc.id,
            type: 'student',
            icon: UserPlus,
            description: (
                <>Nouvel élève, <strong>{student.firstName} {student.lastName}</strong>, ajouté à la classe <strong>{student.class}</strong>.</>
            ),
            date: createdAt,
        });
    });

    recentBooksData?.forEach(doc => {
        const book = doc.data() as Book;
         const createdAt = book.createdAt ? new Date(book.createdAt.seconds * 1000) : new Date();
        activities.push({
            id: doc.id,
            type: 'book',
            icon: BookOpen,
            description: (
                 <><strong>{book.quantity}</strong> exemplaire(s) de <strong>"{book.title}"</strong> ajouté(s) à la bibliothèque.</>
            ),
            date: createdAt,
        });
    });

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  }, [recentStudentsData, recentBooksData]);

  const { totalRevenue, totalExpenses, netBalance } = useMemo(() => {
    const revenue = sum(transactions.filter(t => t.type === 'Revenu'), d => d.amount);
    const expense = sum(transactions.filter(t => t.type === 'Dépense'), d => d.amount);
    return {
      totalRevenue: revenue,
      totalExpenses: expense,
      netBalance: revenue - expense,
    };
  }, [transactions]);
  
  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

  const stats = [
    { title: 'Élèves', value: studentsData?.length ?? 0, icon: Users, color: 'text-sky-500', loading: schoolLoading || studentsLoading },
    { title: 'Enseignants', value: teachersData?.length ?? 0, icon: BookUser, color: 'text-emerald-500', loading: schoolLoading || teachersLoading },
    { title: 'Classes', value: classesData?.length ?? 0, icon: Landmark, color: 'text-amber-500', loading: schoolLoading || classesLoading },
    { title: 'Livres', value: books.reduce((sum, book) => sum + (book.quantity || 0), 0), icon: BookOpen, color: 'text-violet-500', loading: schoolLoading || libraryLoading }
  ];
  
  const overallLoading = schoolLoading || studentsLoading || teachersLoading || classesLoading || libraryLoading || transactionsLoading;
  const activityLoading = recentStudentsLoading || recentBooksLoading;

  return (
    <div className="space-y-6">
       <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Tableau de bord</h1>
      </div>
      <AnnouncementBanner />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Skeleton className="h-8 w-1/2" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground">Total dans l'école</p>
            </CardContent>
          </Card>
        ))}
      </div>

       <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                {overallLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalRevenue)}</div>}
                <p className="text-xs text-muted-foreground">Sur la période sélectionnée</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                {overallLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>}
                <p className="text-xs text-muted-foreground">Sur la période sélectionnée</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Solde Net</CardTitle>
                <Scale className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                {overallLoading ? <Skeleton className="h-8 w-3/4" /> : <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(netBalance)}</div>}
                <p className="text-xs text-muted-foreground">Revenus - Dépenses</p>
                </CardContent>
            </Card>
        </div>
        
        { !overallLoading && transactions.length > 0 && <AccountingCharts transactions={transactions} /> }

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
          <PerformanceChart grades={allGrades} loading={gradesLoading} />
          <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                  <CardTitle>Activité Récente</CardTitle>
                  <CardDescription>Dernières actions et notifications au sein de l'école.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      {activityLoading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-64" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                        ))
                      ) : recentActivity.length > 0 ? (
                        recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center gap-4">
                                <div className="p-2 bg-muted rounded-full">
                                    <activity.icon className="h-4 w-4 text-muted-foreground" />
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
    </div>
  );
}
