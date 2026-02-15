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
            transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
            whileHover={{
              y: -8,
              transition: { duration: 0.2 }
            }}
            className="h-full"
          >
            {/* Iridescent Border Wrapper */}
            <div className="group relative p-[1px] rounded-[var(--radius)] overflow-hidden h-full transition-all duration-500">
              <div className={cn(
                "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm",
                stat.gradient
              )} />

              <Card className="glass-card relative border-white/5 bg-card/40 backdrop-blur-xl h-full overflow-hidden flex flex-col justify-between">
                {/* Secondary Background Glow */}
                <div className={cn(
                  "absolute -right-4 -top-4 w-24 h-24 blur-3xl rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40",
                  stat.bgColor
                )} />

                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{stat.title}</CardTitle>
                  <div className={cn(
                    "p-2.5 rounded-xl transition-all duration-500 shadow-sm",
                    stat.bgColor,
                    "group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]",
                    "border border-white/10"
                  )}>
                    <stat.icon className={cn("h-5 w-5 transition-transform duration-500 group-hover:rotate-12", stat.color)} />
                  </div>
                </CardHeader>

                <CardContent className="relative z-10 pt-4">
                  <div className="flex items-baseline gap-1">
                    <div className="text-4xl font-black tracking-tighter">
                      {loading ? <Skeleton className="h-10 w-20" /> : (
                        <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-foreground/40 drop-shadow-sm">
                          {stat.value}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest group-hover:text-foreground/80 transition-colors">
                      Détails
                    </p>
                    <div className="h-[2px] w-0 bg-foreground/20 group-hover:w-12 transition-all duration-500 ease-out rounded-full" />
                  </div>
                </CardContent>

                {/* Bottom Shine */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Card>
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  )
}
