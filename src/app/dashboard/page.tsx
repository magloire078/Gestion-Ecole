
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookUser, School, BookOpen } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { schoolId, loading } = useSchoolData();
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, books: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  console.log('Dashboard render - schoolId:', schoolId, 'loading:', loading);

  useEffect(() => {
    if (!loading && schoolId) {
      console.log('Fetching data for school:', schoolId);
      // Simuler un chargement de données
      setTimeout(() => {
        setStats({ students: 25, teachers: 5, classes: 3, books: 120 });
        setStatsLoading(false);
      }, 1000);
    } else if (!loading) {
      console.log('No schoolId available');
      setStatsLoading(false);
    }
  }, [schoolId, loading]);

  const statsCards = [
    { title: 'Élèves', value: stats.students, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100', href: '#' },
    { title: 'Enseignants', value: stats.teachers, icon: BookUser, color: 'text-emerald-600', bgColor: 'bg-emerald-100', href: '#' },
    { title: 'Classes', value: stats.classes, icon: School, color: 'text-amber-600', bgColor: 'bg-amber-100', href: '#' },
    { title: 'Livres', value: stats.books, icon: BookOpen, color: 'text-violet-600', bgColor: 'bg-violet-100', href: '#' }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Simplifié</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Link href={stat.href} key={stat.title}>
            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-3 rounded-xl", stat.bgColor)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-1/2 mt-2" />
                ) : (
                  <div className="text-3xl font-bold mt-2">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Statut de connexion</CardTitle>
          <CardDescription>Informations de débogage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>School ID:</strong> {schoolId || 'Non disponible'}</p>
            <p><strong>Chargement:</strong> {loading ? 'Oui' : 'Non'}</p>
            <p><strong>Stats chargées:</strong> {statsLoading ? 'Non' : 'Oui'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
