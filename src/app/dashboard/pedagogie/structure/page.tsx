
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Users, 
  BookOpen, 
  Filter, 
  Search, 
  Calendar,
  GraduationCap,
  School,
  LayoutGrid,
  List
} from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, getCountFromServer } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';

export default function StructurePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCycle, setActiveCycle] = useState<string>('all');
  const { schoolId, loading: schoolLoading } = useSchoolData();
  
  const cyclesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId]);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);

  const [stats, setStats] = useState({ classes: 0, students: 0, teachers: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const firestore = useFirestore();

  useMemo(async () => {
    if (!schoolId) return;
    setStatsLoading(true);
    const classesSnap = await getCountFromServer(collection(firestore, `ecoles/${schoolId}/classes`));
    const studentsSnap = await getCountFromServer(collection(firestore, `ecoles/${schoolId}/eleves`));
    const teachersSnap = await getCountFromServer(collection(firestore, `ecoles/${schoolId}/personnel`));
    setStats({
      classes: classesSnap.data().count,
      students: studentsSnap.data().count,
      teachers: teachersSnap.data().count,
    });
    setStatsLoading(false);
  }, [schoolId, firestore]);

  const cycles = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() })) || [], [cyclesData]);

  const isLoading = schoolLoading || cyclesLoading;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Structure Pédagogique</h1>
          <p className="text-muted-foreground">
            Organisez les cycles, niveaux et classes de votre établissement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          <Button asChild>
            <Link href="/dashboard/pedagogie/structure/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Classe
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher une classe, niveau, enseignant..." className="pl-10" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtres
              </Button>
              <Button variant="outline">
                Année: 2024-2025
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vue par cycles */}
       <Tabs defaultValue="all" onValueChange={setActiveCycle}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="all">Toutes</TabsTrigger>
          {isLoading ? 
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />) :
            cycles.sort((a, b) => a.order - b.order).map(cycle => (
              <TabsTrigger key={cycle.id} value={cycle.id}>{cycle.name}</TabsTrigger>
            ))
          }
        </TabsList>

        <TabsContent value={activeCycle} className="mt-6">
          {viewMode === 'grid' ? (
            <ClassesGridView cycleId={activeCycle} />
          ) : (
            <ClassesListView cycleId={activeCycle} />
          )}
        </TabsContent>
      </Tabs>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
             {statsLoading ? <Skeleton className="h-16 w-full" /> : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Classes Actives</p>
                  <p className="text-2xl font-bold">{stats.classes}</p>
                </div>
                <School className="h-8 w-8 text-blue-500" />
              </div>
             )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {statsLoading ? <Skeleton className="h-16 w-full" /> : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Élèves</p>
                  <p className="text-2xl font-bold">{stats.students}</p>
                </div>
                <Users className="h-8 w-8 text-emerald-500" />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {statsLoading ? <Skeleton className="h-16 w-full" /> : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taux Remplissage</p>
                  <p className="text-2xl font-bold">N/A</p>
                </div>
                <GraduationCap className="h-8 w-8 text-amber-500" />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {statsLoading ? <Skeleton className="h-16 w-full" /> : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Enseignants</p>
                  <p className="text-2xl font-bold">{stats.teachers}</p>
                </div>
                <BookOpen className="h-8 w-8 text-violet-500" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
