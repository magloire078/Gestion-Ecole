
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, getCountFromServer, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  BookUser, 
  School, 
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { libraryBook as LibraryBook } from '@/lib/data-types';


export function StatCards({ schoolId }: { schoolId: string }) {
    const firestore = useFirestore();
    const [stats, setStats] = useState({
        students: 0,
        teachers: 0,
        classes: 0,
        books: 0,
    });
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!schoolId || !firestore) return;
    
        const fetchStats = async () => {
          setLoading(true);
          try {
            const studentsQuery = query(collection(firestore, `ecoles/${schoolId}/eleves`));
            const teachersQuery = query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant'));
            const classesQuery = query(collection(firestore, `ecoles/${schoolId}/classes`));
            const booksQuery = query(collection(firestore, `ecoles/${schoolId}/bibliotheque`));

            const [
              studentsSnapshot,
              teachersSnapshot,
              classesSnapshot,
              booksSnapshot,
            ] = await Promise.all([
              getCountFromServer(studentsQuery),
              getCountFromServer(teachersQuery),
              getCountFromServer(classesQuery),
              getCountFromServer(booksQuery),
            ]);

            setStats({
              students: studentsSnapshot.data().count,
              teachers: teachersSnapshot.data().count,
              classes: classesSnapshot.data().count,
              books: booksSnapshot.data().count, // On compte le nombre de titres, pas la quantité totale
            });
    
          } catch (error) {
            console.error("Error fetching dashboard stats:", error);
          } finally {
            setLoading(false);
          }
        };
    
        fetchStats();
      }, [schoolId, firestore]);
    
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
          )
      }

    return (
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
    )
}
