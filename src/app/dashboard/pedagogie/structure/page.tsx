
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  LayoutGrid,
  List,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { cycle as Cycle, niveau as Niveau } from '@/lib/data-types';

export default function StructurePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCycleFilter, setActiveCycleFilter] = useState<string>('all');
  
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();

  // --- Data Fetching ---
  const cyclesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId, firestore]);
  const niveauxQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId, firestore]);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);

  const cycles: (Cycle & {id: string})[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & {id: string})) || [], [cyclesData]);
  const niveaux: (Niveau & {id: string})[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & {id: string})) || [], [niveauxData]);
  
  const cycleMap = useMemo(() => new Map(cycles.map(c => [c.id, c.name])), [cycles]);

  const isLoading = schoolLoading || cyclesLoading || niveauxLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Structure Pédagogique</h1>
        <p className="text-muted-foreground">
          Organisez les cycles, niveaux et classes de votre établissement.
        </p>
      </div>

      <Tabs defaultValue="classes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="niveaux">Niveaux</TabsTrigger>
              <TabsTrigger value="cycles">Cycles</TabsTrigger>
          </TabsList>
          
          <TabsContent value="classes" className="mt-6 space-y-6">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Rechercher une classe..." className="pl-10" />
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

              <Tabs defaultValue="all" onValueChange={setActiveCycleFilter}>
                  <TabsList>
                      <TabsTrigger value="all">Toutes</TabsTrigger>
                      {isLoading ? 
                          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-24" />) :
                          cycles.sort((a, b) => a.order - b.order).map(cycle => (
                          <TabsTrigger key={cycle.id} value={cycle.id}>{cycle.name}</TabsTrigger>
                          ))
                      }
                  </TabsList>

                  <TabsContent value={activeCycleFilter} className="mt-6">
                      {viewMode === 'grid' ? (
                          <ClassesGridView cycleId={activeCycleFilter} />
                      ) : (
                          <ClassesListView cycleId={activeCycleFilter} />
                      )}
                  </TabsContent>
              </Tabs>
          </TabsContent>

           <TabsContent value="niveaux" className="mt-6 space-y-4">
               <Card>
                  <CardHeader>
                    <CardTitle>Liste des Niveaux</CardTitle>
                    <CardDescription>Liste des niveaux scolaires disponibles dans le système.</CardDescription>
                  </CardHeader>
                  <CardContent>
                       <Table>
                          <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Code</TableHead><TableHead>Cycle</TableHead><TableHead>Ordre</TableHead></TableRow></TableHeader>
                          <TableBody>
                              {isLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>) : 
                              niveaux.sort((a, b) => a.order - b.order).map(n => (
                                  <TableRow key={n.id}><TableCell>{n.name}</TableCell><TableCell>{n.code}</TableCell><TableCell>{cycleMap.get(n.cycleId) || 'N/A'}</TableCell><TableCell>{n.order}</TableCell></TableRow>
                              ))}
                          </TableBody>
                       </Table>
                  </CardContent>
               </Card>
           </TabsContent>

           <TabsContent value="cycles" className="mt-6 space-y-4">
               <Card>
                <CardHeader>
                  <CardTitle>Liste des Cycles</CardTitle>
                  <CardDescription>Liste des cycles d'enseignement disponibles dans le système.</CardDescription>
                </CardHeader>
                <CardContent>
                       <Table>
                          <TableHeader><TableRow><TableHead>Nom du Cycle</TableHead><TableHead>Code</TableHead><TableHead>Ordre</TableHead></TableRow></TableHeader>
                          <TableBody>
                              {isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell></TableRow>) : 
                              cycles.sort((a,b) => a.order - b.order).map(c => (
                                  <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell>{c.code}</TableCell><TableCell>{c.order}</TableCell></TableRow>
                              ))}
                          </TableBody>
                       </Table>
                  </CardContent>
               </Card>
           </TabsContent>
      </Tabs>
    </div>
  );
}
