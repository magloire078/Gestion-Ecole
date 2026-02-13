'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getCountFromServer, where } from 'firebase/firestore';
import {
  Users,
  BookUser,
  School,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { libraryBook as LibraryBook } from '@/lib/data-types';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';


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
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100/50 dark:bg-blue-900/30',
      gradient: 'from-blue-500/20 to-indigo-500/20',
      href: '/dashboard/dossiers-eleves'
    },
    {
      title: 'Enseignants',
      value: stats.teachers,
      icon: BookUser,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-100/50 dark:bg-cyan-900/30',
      gradient: 'from-cyan-500/20 to-sky-500/20',
      href: '/dashboard/rh'
    },
    {
      title: 'Classes',
      value: stats.classes,
      icon: School,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100/50 dark:bg-indigo-900/30',
      gradient: 'from-indigo-500/20 to-violet-500/20',
      href: '/dashboard/pedagogie/structure'
    },
    {
      title: 'Livres',
      value: stats.books,
      icon: BookOpen,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-100/50 dark:bg-sky-900/30',
      gradient: 'from-sky-500/20 to-blue-500/20',
      href: '/dashboard/bibliotheque'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat, index) => (
        <Link href={stat.href} key={stat.title}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <Card className="glass-card relative overflow-hidden group border-white/10">
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", stat.gradient)} />

              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
              </div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{stat.title}</CardTitle>
                <div className={cn("p-2.5 rounded-xl transition-all duration-500 shadow-sm", stat.bgColor, "group-hover:scale-110 group-hover:shadow-glow")}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-black tracking-tighter">
                  {loading ? <Skeleton className="h-9 w-20" /> : (
                    <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                      {stat.value}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium group-hover:text-foreground/70 transition-colors">
                  Voir les détails →
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </Link>
      ))}
    </div>
  )
}
