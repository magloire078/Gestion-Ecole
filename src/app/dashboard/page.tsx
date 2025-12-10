
'use client';

import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookUser, Landmark, BookOpen, UserPlus, TrendingUp, TrendingDown, FileText, CalendarClock, MessageSquare } from 'lucide-react';
import { PerformanceChart } from '@/components/performance-chart';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection, query, orderBy, limit, getDocs, collectionGroup } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { libraryBook as Book, student as Student, gradeEntry as GradeEntry } from '@/lib/data-types';
import { useHydrationFix } from '@/hooks/use-hydration-fix';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  const { schoolData, loading: schoolLoading } = useSchoolData();
  const schoolId = schoolData?.id;

  // --- Data for Stats Cards ---
  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/eleves`) : null, [firestore, schoolId]);
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/enseignants`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const libraryQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/bibliotheque`) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: libraryData, loading: libraryLoading } = useCollection(libraryQuery);
  
  const books: Book[] = useMemo(() => libraryData?.map(d => ({ id: d.id, ...d.data() } as Book)) || [], [libraryData]);

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
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), orderBy('createdAt', 'desc'), limit(3)) : null
  , [firestore, schoolId]);
  const recentMessagesQuery = useMemoFirebase(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/messagerie`), orderBy('createdAt', 'desc'), limit(2)) : null
  , [firestore, schoolId]);

  const { data: recentStudentsData, loading: recentStudentsLoading } = useCollection(recentStudentsQuery);
  const { data: recentMessagesData, loading: recentMessagesLoading } = useCollection(recentMessagesQuery);
  
  const recentActivity = useMemo(() => {
    const activities: any[] = [];

    recentStudentsData?.forEach(doc => {
        const student = doc.data() as Student;
        const createdAt = student.createdAt ? new Date(student.createdAt.seconds * 1000) : new Date();
        activities.push({
            id: doc.id,
            type: 'student',
            icon: UserPlus,
            color: 'bg-blue-100 dark:bg-blue-900/50',
            description: (
                <>Nouvel élève, <strong>{student.firstName} {student.lastName}</strong>, ajouté.</>
            ),
            date: createdAt,
        });
    });

    recentMessagesData?.forEach(doc => {
        const message = doc.data();
         const createdAt = message.createdAt ? new Date(message.createdAt.seconds * 1000) : new Date();
        activities.push({
            id: doc.id,
            type: 'message',
            icon: MessageSquare,
            color: 'bg-green-100 dark:bg-green-900/50',
            description: (
                 <>Message <strong>"{message.title}"</strong> envoyé par <strong>{message.senderName}</strong>.</>
            ),
            date: createdAt,
        });
    });

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  }, [recentStudentsData, recentMessagesData]);

  const stats = [
    { title: 'Élèves', value: studentsData?.length ?? 0, icon: Users, loading: studentsLoading, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
    { title: 'Enseignants', value: teachersData?.length ?? 0, icon: BookUser, loading: teachersLoading, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50' },
    { title: 'Classes', value: classesData?.length ?? 0, icon: Landmark, loading: classesLoading, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/50' },
    { title: 'Livres', value: books.reduce((sum, book) => sum + (book.quantity || 0), 0), icon: BookOpen, loading: libraryLoading, color: 'text-violet-600', bgColor: 'bg-violet-100 dark:bg-violet-900/50' }
  ];
  
  const activityLoading = recentStudentsLoading || recentMessagesLoading;

  return (
    <div className="space-y-6">
       <div className="flex items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tableau de Bord</h1>
      </div>
      <AnnouncementBanner />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Skeleton className="h-8 w-1/2" />
              ) : (
                <div className="text-3xl font-bold">{stat.value}</div>
              )}
               <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 text-xs">+2%</span>
                <span className="text-gray-500 text-xs ml-1">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
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
                    <CardTitle>Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Button variant="outline" asChild className="h-20 flex-col gap-1">
                    <Link href="/dashboard/inscription">
                      <UserPlus className="h-6 w-6 text-blue-600" />
                      <span className="text-xs font-medium">Nouvel Élève</span>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="h-20 flex-col gap-1">
                    <Link href="/dashboard/notes">
                      <FileText className="h-6 w-6 text-emerald-600" />
                      <span className="text-xs font-medium">Saisir Notes</span>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="h-20 flex-col gap-1">
                    <Link href="/dashboard/messagerie">
                      <MessageSquare className="h-6 w-6 text-violet-600" />
                      <span className="text-xs font-medium">Message</span>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="h-20 flex-col gap-1">
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
