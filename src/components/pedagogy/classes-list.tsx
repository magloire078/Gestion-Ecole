
'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, LayoutGrid, List, PlusCircle } from 'lucide-react';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { cycle as Cycle } from '@/lib/data-types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ClassForm } from './class-form';
import type { staff as Staff, niveau as Niveau, class_type as ClassType } from '@/lib/data-types';
import { useSchoolData } from '@/hooks/use-school-data';

export function ClassesList() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<(ClassType & { id: string }) | null>(null);

  const { user } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();

  const isDirectorOrAdmin = user?.profile?.permissions?.manageClasses;

  const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId, firestore]);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);

  const cycles = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & { id: string })).sort((a,b) => a.order - b.order) || [], [cyclesData]);

  const allTeachersQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [schoolId, firestore]);
  const allNiveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId, firestore]);
  const { data: teachersData, loading: teachersLoading } = useCollection(allTeachersQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(allNiveauxQuery);
  
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);
  const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & { id: string })) || [], [niveauxData]);


  const handleOpenForm = (classe: (ClassType & { id: string }) | null) => {
    setEditingClass(classe);
    setIsFormOpen(true);
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setEditingClass(null);
  };

  const isLoading = schoolLoading || cyclesLoading || teachersLoading || niveauxLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Toutes les Classes</CardTitle>
              <CardDescription>Vue d'ensemble de toutes les classes de l'établissement, groupées par cycle.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>
              {isDirectorOrAdmin && (
                <Button onClick={() => handleOpenForm(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" />Nouvelle Classe
                </Button>
              )}
            </div>
          </div>
          <div className="relative flex-1 mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une classe..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={cycles.map(c => c.id)} className="w-full space-y-2">
            {cycles.map(cycle => (
              <AccordionItem value={cycle.id} key={cycle.id}>
                 <AccordionTrigger className="p-2 bg-muted hover:bg-muted/80 rounded-md">
                   <div className="flex items-center gap-2 font-semibold">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: cycle.color}} />
                      {cycle.name}
                   </div>
                 </AccordionTrigger>
                 <AccordionContent className="pt-4">
                    {viewMode === 'grid' ? (
                      <ClassesGridView cycleId={cycle.id} searchQuery={searchQuery} onEdit={handleOpenForm} />
                    ) : (
                      <ClassesListView cycleId={cycle.id} searchQuery={searchQuery} onEdit={handleOpenForm} />
                    )}
                 </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Modifier la classe' : 'Nouvelle Classe'}</DialogTitle>
            <DialogDescription>{editingClass ? `Modification de la classe ${editingClass.name}` : "Créez une nouvelle classe pour l'année en cours."}</DialogDescription>
          </DialogHeader>
          <ClassForm 
            schoolId={schoolId!}
            cycles={cycles}
            niveaux={niveaux}
            teachers={teachers}
            classe={editingClass}
            onSave={handleFormSave}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
