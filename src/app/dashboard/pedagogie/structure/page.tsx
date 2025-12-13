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
  Plus,
  Edit,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, doc, setDoc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { cycle as Cycle, niveau as Niveau } from '@/lib/data-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const cycleSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  code: z.string().min(2, "Le code est requis.").max(5, "Le code ne peut excéder 5 caractères."),
  order: z.coerce.number().min(1, "L'ordre est requis."),
  color: z.string().optional(),
});
type CycleFormValues = z.infer<typeof cycleSchema>;

const niveauSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  code: z.string().min(1, "Le code est requis.").max(10, "Le code ne peut excéder 10 caractères."),
  order: z.coerce.number().min(1, "L'ordre est requis."),
  cycleId: z.string().min(1, 'Le cycle est requis.'),
  capacity: z.coerce.number().min(1, 'La capacité est requise.'),
  ageMin: z.coerce.number().optional(),
  ageMax: z.coerce.number().optional(),
});
type NiveauFormValues = z.infer<typeof niveauSchema>;


export default function StructurePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCycleFilter, setActiveCycleFilter] = useState<string>('all');
  const [selectedCycleForDisplay, setSelectedCycleForDisplay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();

  const [isCycleFormOpen, setIsCycleFormOpen] = useState(false);
  const [isNiveauFormOpen, setIsNiveauFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle & {id: string} | null>(null);
  const [editingNiveau, setEditingNiveau] = useState<Niveau & {id: string} | null>(null);

  // --- Data Fetching ---
  const cyclesQuery = useMemoFirebase(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, 
    [schoolId]
  );
  
  const niveauxQuery = useMemoFirebase(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, 
    [schoolId]
  );
  
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);

  // Transform data
  const cycles: (Cycle & {id: string})[] = useMemo(() => 
    cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & {id: string})) || [], 
    [cyclesData]
  );
  
  const niveaux: (Niveau & {id: string})[] = useMemo(() => 
    niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & {id: string})) || [], 
    [niveauxData]
  );

  const cycleForm = useForm<CycleFormValues>({
    resolver: zodResolver(cycleSchema),
    defaultValues: { name: '', code: '', order: cycles.length + 1, color: '#3b82f6' }
  });
  
  const niveauForm = useForm<NiveauFormValues>({
    resolver: zodResolver(niveauSchema),
    defaultValues: { name: '', code: '', order: 1, cycleId: '', capacity: 30 }
  });

  // Create cycle map for quick lookup
  const cycleMap = useMemo(() => new Map(cycles.map(c => [c.id, c])), [cycles]);

  // Group niveaux by cycle for display
  const niveauxByCycle = useMemo(() => {
    const grouped: Record<string, (Niveau & {id: string})[]> = {};
    cycles.forEach(cycle => { grouped[cycle.id] = []; });
    grouped['unassigned'] = [];
    
    niveaux.forEach(niveau => {
      if (cycleMap.has(niveau.cycleId)) {
        if (!grouped[niveau.cycleId]) grouped[niveau.cycleId] = [];
        grouped[niveau.cycleId].push(niveau);
      } else {
        grouped['unassigned'].push(niveau);
      }
    });
    return grouped;
  }, [niveaux, cycles, cycleMap]);

  // Filtered cycles for display (with search)
  const filteredCycles = useMemo(() => {
    if (!searchQuery) return cycles;
    return cycles.filter(cycle => 
      cycle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cycle.code && cycle.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [cycles, searchQuery]);


  const isLoading = schoolLoading || cyclesLoading || niveauxLoading;
  
  const handleAddCycleSubmit = async (values: CycleFormValues) => {
    if (!schoolId) return;
    try {
      const docPath = editingCycle ? `ecoles/${schoolId}/cycles/${editingCycle.id}` : `ecoles/${schoolId}/cycles`;
      if (editingCycle) {
        await setDoc(doc(firestore, docPath), { ...values, schoolId }, { merge: true });
        toast({ title: 'Cycle modifié', description: `Le cycle "${values.name}" a été mis à jour.`});
      } else {
        await addDoc(collection(firestore, docPath), { ...values, schoolId });
        toast({ title: 'Cycle créé', description: `Le cycle "${values.name}" a été ajouté.`});
      }
      setIsCycleFormOpen(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder le cycle.'});
    }
  };

  const handleOpenCycleForm = (cycle: Cycle & {id: string} | null) => {
      setEditingCycle(cycle);
      cycleForm.reset(cycle ? {
        name: cycle.name,
        code: cycle.code,
        order: cycle.order,
        color: cycle.color || '#3b82f6'
      } : { name: '', code: '', order: cycles.length + 1, color: '#3b82f6' });
      setIsCycleFormOpen(true);
  }

  const handleAddNiveauSubmit = async (values: NiveauFormValues) => {
    if (!schoolId) return;
    try {
      const docPath = editingNiveau ? `ecoles/${schoolId}/niveaux/${editingNiveau.id}` : `ecoles/${schoolId}/niveaux`;
      if (editingNiveau) {
        await setDoc(doc(firestore, docPath), { ...values, schoolId }, { merge: true });
        toast({ title: 'Niveau modifié', description: `Le niveau "${values.name}" a été mis à jour.`});
      } else {
        await addDoc(collection(firestore, docPath), { ...values, schoolId });
        toast({ title: 'Niveau créé', description: `Le niveau "${values.name}" a été ajouté.`});
      }
      setIsNiveauFormOpen(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder le niveau.'});
    }
  };

  const handleOpenNiveauForm = (niveau: Niveau & {id: string} | null) => {
      setEditingNiveau(niveau);
      niveauForm.reset(niveau || { name: '', code: '', order: 1, cycleId: '', capacity: 30 });
      setIsNiveauFormOpen(true);
  }

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
          <TabsTrigger value="cycles">Cycles & Niveaux</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="matieres">Matières</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cycles" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestion des Cycles</CardTitle>
                  <CardDescription>
                    Cliquez sur un cycle pour voir les niveaux associés.
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenCycleForm(null)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Cycle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Code</TableHead><TableHead>Ordre</TableHead><TableHead>Niveaux</TableHead><TableHead className="text-right w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                    : filteredCycles.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun cycle trouvé</TableCell></TableRow>
                    : filteredCycles.sort((a, b) => a.order - b.order).map((cycle) => (
                          <TableRow key={cycle.id} className="group hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedCycleForDisplay(cycle.id)}>
                            <TableCell className="font-medium"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: cycle.color || '#3b82f6' }} />{cycle.name}</div></TableCell>
                            <TableCell><Badge variant="outline">{cycle.code}</Badge></TableCell>
                            <TableCell>{cycle.order}</TableCell>
                            <TableCell><Badge variant="secondary">{niveauxByCycle[cycle.id]?.length || 0} niveau(x)</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenCycleForm(cycle); }}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedCycleForDisplay(cycle.id);}}><ChevronDown className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>
              {selectedCycleForDisplay && cycleMap.has(selectedCycleForDisplay) && (
                <Accordion type="single" collapsible defaultValue="details" value="details">
                  <AccordionItem value="details"><AccordionTrigger className="px-4" onClick={() => setSelectedCycleForDisplay(null)}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: cycleMap.get(selectedCycleForDisplay)?.color || '#3b82f6' }}/><span className="font-medium">{cycleMap.get(selectedCycleForDisplay)?.name} - Niveaux associés</span></div></AccordionTrigger>
                    <AccordionContent className="p-4">
                      <div className="space-y-3">
                         <div className="flex justify-end">
                            <Button size="sm" variant="outline" onClick={() => handleOpenNiveauForm(null)}><Plus className="mr-2 h-4 w-4" />Ajouter un Niveau</Button>
                         </div>
                        {niveauxByCycle[selectedCycleForDisplay]?.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Aucun niveau n'est associé à ce cycle</p>
                        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {niveauxByCycle[selectedCycleForDisplay]?.sort((a, b) => a.order - b.order).map((niveau) => (
                                <div key={niveau.id} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors group relative">
                                    <div className="font-medium">{niveau.name}</div>
                                    <div className="text-xs text-muted-foreground">Capacité: {niveau.capacity} élèves</div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenNiveauForm(niveau)}><Edit className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                              ))}
                          </div>
                        }
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="classes" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Rechercher une classe..." className="pl-10" /></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>{viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}</Button>
              <Button asChild><Link href="/dashboard/pedagogie/structure/new"><Plus className="mr-2 h-4 w-4" />Nouvelle Classe</Link></Button>
            </div>
          </div>
          <Tabs defaultValue="all" onValueChange={setActiveCycleFilter}>
            <TabsList>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-24" />) : cycles.sort((a, b) => a.order - b.order).map(cycle => <TabsTrigger key={cycle.id} value={cycle.id}>{cycle.name}</TabsTrigger>)}
            </TabsList>
            <TabsContent value={activeCycleFilter} className="mt-6">{viewMode === 'grid' ? <ClassesGridView cycleId={activeCycleFilter} /> : <ClassesListView cycleId={activeCycleFilter} />}</TabsContent>
          </Tabs>
        </TabsContent>
        
        <TabsContent value="matieres" className="mt-6 space-y-6"><Card><CardHeader><CardTitle>Gestion des Matières</CardTitle><CardDescription>Bientôt disponible.</CardDescription></CardHeader><CardContent><p className="text-muted-foreground">La gestion détaillée des matières sera ajoutée dans une future mise à jour.</p></CardContent></Card></TabsContent>
      </Tabs>
    </div>
    
    <Dialog open={isCycleFormOpen} onOpenChange={setIsCycleFormOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editingCycle ? 'Modifier' : 'Nouveau'} Cycle</DialogTitle></DialogHeader>
        <Form {...cycleForm}>
          <form id="cycle-form" onSubmit={cycleForm.handleSubmit(handleAddCycleSubmit)} className="space-y-4">
             <FormField control={cycleForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du cycle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={cycleForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={cycleForm.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre d'affichage</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={cycleForm.control} name="color" render={({ field }) => (<FormItem><FormLabel>Couleur</FormLabel><FormControl><Input type="color" {...field} className="h-10" /></FormControl><FormMessage /></FormItem>)} />
          </form>
        </Form>
        <DialogFooter><Button variant="outline" onClick={() => setIsCycleFormOpen(false)}>Annuler</Button><Button type="submit" form="cycle-form" disabled={cycleForm.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isNiveauFormOpen} onOpenChange={setIsNiveauFormOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editingNiveau ? 'Modifier' : 'Nouveau'} Niveau</DialogTitle></DialogHeader>
        <Form {...niveauForm}>
          <form id="niveau-form" onSubmit={niveauForm.handleSubmit(handleAddNiveauSubmit)} className="space-y-4">
             <FormField control={niveauForm.control} name="cycleId" render={({ field }) => (<FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un cycle" /></SelectTrigger></FormControl><SelectContent>{cycles.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
             <FormField control={niveauForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du niveau</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={niveauForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
             <div className="grid grid-cols-2 gap-4">
                <FormField control={niveauForm.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={niveauForm.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
             </div>
          </form>
        </Form>
        <DialogFooter><Button variant="outline" onClick={() => setIsNiveauFormOpen(false)}>Annuler</Button><Button type="submit" form="niveau-form" disabled={niveauForm.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
