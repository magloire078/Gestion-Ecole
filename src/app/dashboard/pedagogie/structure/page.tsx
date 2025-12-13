
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  LayoutGrid,
  List
} from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { cycle as Cycle, niveau as Niveau } from '@/lib/data-types';


const cycleSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  code: z.string().min(1, 'Le code est requis.'),
  order: z.coerce.number().min(1, "L'ordre est requis."),
});
type CycleFormValues = z.infer<typeof cycleSchema>;

const niveauSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  code: z.string().min(1, 'Le code est requis.'),
  cycleId: z.string().min(1, 'Le cycle est requis.'),
  order: z.coerce.number().min(1, "L'ordre est requis."),
  ageMin: z.coerce.number().min(1, "L'âge min. est requis."),
  ageMax: z.coerce.number().min(1, "L'âge max. est requis."),
  capacity: z.coerce.number().min(1, "La capacité est requise."),
});
type NiveauFormValues = z.infer<typeof niveauSchema>;


export default function StructurePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCycleFilter, setActiveCycleFilter] = useState<string>('all');
  const [isCycleFormOpen, setIsCycleFormOpen] = useState(false);
  const [isNiveauFormOpen, setIsNiveauFormOpen] = useState(false);
  
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { toast } = useToast();

  // --- Data Fetching ---
  const cyclesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId, firestore]);
  const niveauxQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId, firestore]);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);

  const cycles: (Cycle & {id: string})[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & {id: string})) || [], [cyclesData]);
  const niveaux: (Niveau & {id: string})[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & {id: string})) || [], [niveauxData]);
  
  const cycleMap = useMemo(() => new Map(cycles.map(c => [c.id, c.name])), [cycles]);

  // --- Forms ---
  const cycleForm = useForm<CycleFormValues>({ resolver: zodResolver(cycleSchema) });
  const niveauForm = useForm<NiveauFormValues>({ resolver: zodResolver(niveauSchema), defaultValues: { order: (niveaux.length + 1) * 10 } });

  const handleCreateCycle = async (values: CycleFormValues) => {
    if (!schoolId) return;
    try {
        await addDoc(collection(firestore, `ecoles/${schoolId}/cycles`), { ...values, schoolId, createdAt: serverTimestamp() });
        toast({ title: "Cycle créé !" });
        setIsCycleFormOpen(false);
        cycleForm.reset();
    } catch(e) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer le cycle." });
    }
  };

  const handleCreateNiveau = async (values: NiveauFormValues) => {
     if (!schoolId) return;
    try {
        await addDoc(collection(firestore, `ecoles/${schoolId}/niveaux`), { ...values, schoolId, createdAt: serverTimestamp() });
        toast({ title: "Niveau créé !" });
        setIsNiveauFormOpen(false);
        niveauForm.reset();
    } catch(e) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer le niveau." });
    }
  };

  const isLoading = schoolLoading || cyclesLoading || niveauxLoading;

  return (
    <>
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
                 <div className="flex justify-between items-center">
                    <CardTitle>Liste des Niveaux</CardTitle>
                    <Button onClick={() => setIsNiveauFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> Ajouter un Niveau</Button>
                 </div>
                 <Card>
                    <CardContent className="pt-6">
                         <Table>
                            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Code</TableHead><TableHead>Cycle</TableHead><TableHead>Ordre</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>) : 
                                niveaux.map(n => (
                                    <TableRow key={n.id}><TableCell>{n.name}</TableCell><TableCell>{n.code}</TableCell><TableCell>{cycleMap.get(n.cycleId) || 'N/A'}</TableCell><TableCell>{n.order}</TableCell></TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </CardContent>
                 </Card>
             </TabsContent>

             <TabsContent value="cycles" className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                    <CardTitle>Liste des Cycles</CardTitle>
                    <Button onClick={() => setIsCycleFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> Ajouter un Cycle</Button>
                </div>
                 <Card>
                    <CardContent className="pt-6">
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

       {/* Dialog for adding a new cycle */}
      <Dialog open={isCycleFormOpen} onOpenChange={setIsCycleFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau cycle</DialogTitle>
            <DialogDescription>Définissez un nouveau cycle d'enseignement pour votre école.</DialogDescription>
          </DialogHeader>
          <Form {...cycleForm}>
            <form id="cycle-form" onSubmit={cycleForm.handleSubmit(handleCreateCycle)} className="space-y-4 py-4">
              <FormField control={cycleForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du cycle</FormLabel><FormControl><Input placeholder="Ex: Enseignement Supérieur" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={cycleForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="Ex: SUP" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={cycleForm.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre d'affichage</FormLabel><FormControl><Input type="number" placeholder="Ex: 50" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCycleFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="cycle-form" disabled={cycleForm.formState.isSubmitting}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for adding a new niveau */}
      <Dialog open={isNiveauFormOpen} onOpenChange={setIsNiveauFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau niveau</DialogTitle>
            <DialogDescription>Créez un niveau et associez-le à un cycle existant.</DialogDescription>
          </DialogHeader>
          <Form {...niveauForm}>
            <form id="niveau-form" onSubmit={niveauForm.handleSubmit(handleCreateNiveau)} className="space-y-4 py-4">
               <div className="grid grid-cols-2 gap-4">
                <FormField control={niveauForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Ex: Licence 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={niveauForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="Ex: L1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={niveauForm.control} name="cycleId" render={({ field }) => (<FormItem><FormLabel>Cycle</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un cycle..." /></SelectTrigger></FormControl><SelectContent>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
               <div className="grid grid-cols-2 gap-4">
                <FormField control={niveauForm.control} name="ageMin" render={({ field }) => (<FormItem><FormLabel>Âge Min</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={niveauForm.control} name="ageMax" render={({ field }) => (<FormItem><FormLabel>Âge Max</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
               <div className="grid grid-cols-2 gap-4">
                <FormField control={niveauForm.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={niveauForm.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNiveauFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="niveau-form" disabled={niveauForm.formState.isSubmitting}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
