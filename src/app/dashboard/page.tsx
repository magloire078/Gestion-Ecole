
'use client';

import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookUser, BookOpen, Landmark } from 'lucide-react';
import { PerformanceChart } from '@/components/performance-chart';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthProtection } from '@/hooks/use-auth-protection.tsx';

interface Book {
    quantity: number;
}

export default function DashboardPage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const studentsQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/students`) : null, [firestore, schoolId]);
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/teachers`) : null, [firestore, schoolId]);
  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/classes`) : null, [firestore, schoolId]);
  const libraryQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/library`) : null, [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const { data: libraryData, loading: libraryLoading } = useCollection(libraryQuery);
  
  const books: Book[] = useMemo(() => libraryData?.map(d => d.data() as Book) || [], [libraryData]);

  const stats = [
    { title: 'Élèves', value: studentsData?.length ?? 0, icon: Users, color: 'text-sky-500', loading: schoolLoading || studentsLoading },
    { title: 'Enseignants', value: teachersData?.length ?? 0, icon: Users, color: 'text-emerald-500', loading: schoolLoading || teachersLoading },
    { title: 'Classes', value: classesData?.length ?? 0, icon: BookUser, color: 'text-amber-500', loading: schoolLoading || classesLoading },
    { title: 'Livres', value: books.reduce((sum, book) => sum + (book.quantity || 0), 0), icon: BookOpen, color: 'text-violet-500', loading: schoolLoading || libraryLoading }
  ];

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

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

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
          <PerformanceChart />
          <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                  <CardTitle>Activité Récente</CardTitle>
                  <CardDescription>Dernières actions et notifications.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full"><Users className="h-4 w-4" /></div>
                        <p className="text-sm text-muted-foreground">Nouvel élève, <strong>Alice Durand</strong>, ajouté à la classe <strong>Terminale A</strong>.</p>
                      </div>
                       <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full"><BookUser className="h-4 w-4" /></div>
                        <p className="text-sm text-muted-foreground">La classe <strong>Terminale B</strong> a été mise à jour par <strong>Mme. Martin</strong>.</p>
                      </div>
                       <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full"><BookOpen className="h-4 w-4" /></div>
                        <p className="text-sm text-muted-foreground">5 copies de <strong>"Les Misérables"</strong> ont été ajoutées à la bibliothèque.</p>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
