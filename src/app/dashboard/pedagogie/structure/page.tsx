

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  LayoutGrid,
  List,
  Plus,
  Edit
} from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, addDoc, doc, setDoc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { cycle as Cycle, niveau as Niveau } from '@/lib/data-types';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import { Switch } from '@/components/ui/switch';

const cycleSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  code: z.string().min(2, "Le code est requis.").max(5, "Le code ne peut excéder 5 caractères."),
  order: z.coerce.number().min(1, "L'ordre est requis."),
  isActive: z.boolean().default(true),
  color: z.string().optional(),
});
type CycleFormValues = z.infer<typeof cycleSchema>;

const niveauSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  code: z.string().min(1, "Le code est requis.").max(10, "Le code ne peut excéder 10 caractères."),
  order: z.coerce.number().min(1, "L'ordre est requis."),
  cycleId: z.string().min(1, 'Le cycle est requis.'),
  capacity: z.coerce.number().min(1, 'La capacité est requise.'),
  ageMin: z.coerce.number().optional(),
  ageMax: z.coerce.number().optional(),
});
type NiveauFormValues = z.infer<typeof niveauSchema>;

const ivorianCycles = SCHOOL_TEMPLATES.IVORIAN_SYSTEM.cycles;
const ivorianNiveaux = SCHOOL_TEMPLATES.IVORIAN_SYSTEM.niveaux;

export default function StructurePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCycleFilter, setActiveCycleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const canManageClasses = !!user?.profile?.permissions?.manageClasses;

  const [isCycleFormOpen, setIsCycleFormOpen] = useState(false);
  const [isNiveauFormOpen, setIsNiveauFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle & {id: string} | null>(null);
  const [editingNiveau, setEditingNiveau] = useState<Niveau & {id: string} | null>(null);

  // --- Data Fetching ---
  const cyclesQuery = useMemoFirebase(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, 
    [schoolId, firestore]
  );
  
  const niveauxQuery = useMemoFirebase(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, 
    [schoolId, firestore]
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
    defaultValues: { name: '', code: '', order: cycles.length + 1, isActive: true, color: '#3b82f6' }
  });
  
  const niveauForm = useForm<NiveauFormValues>({
    resolver: zodResolver(niveauSchema),
    defaultValues: { name: '', code: '', order: 1, cycleId: '', capacity: 30 }
  });

  const cycleMap = useMemo(() => new Map(cycles.map(c => [c.id, c])), [cycles]);
  
  const watchedCycleName = cycleForm.watch('name');
  const watchedNiveauCycleId = niveauForm.watch('cycleId');
  const selectedCycleForNiveau = cycles.find(c => c.id === watchedNiveauCycleId);
  const niveauxOptionsForSelectedCycle = selectedCycleForNiveau ? ivorianNiveaux[selectedCycleForNiveau.name as keyof typeof ivorianNiveaux] || [] : [];


  useEffect(() => {
      const selectedCycleTemplate = ivorianCycles.find(c => c.name === watchedCycleName);
      if (selectedCycleTemplate) {
          cycleForm.setValue('code', selectedCycleTemplate.code);
          cycleForm.setValue('order', selectedCycleTemplate.order);
      }
  }, [watchedCycleName, cycleForm]);
  
  useEffect(() => {
      niveauForm.setValue('name', '');
  }, [watchedNiveauCycleId, niveauForm]);

  useEffect(() => {
    const watchedNiveauName = niveauForm.watch('name');
    const selectedNiveauTemplate = niveauxOptionsForSelectedCycle.find(n => n === watchedNiveauName);
    if(selectedNiveauTemplate) {
        niveauForm.setValue('code', selectedNiveauTemplate.replace(/\s+/g, '').toUpperCase());
    }
  }, [niveauForm.watch('name'), niveauxOptionsForSelectedCycle, niveauForm]);


  const filteredNiveaux = useMemo(() => {
    let filtered = niveaux;

    if (searchQuery) {
        filtered = filtered.filter(niveau => 
          niveau.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          niveau.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    return filtered.sort((a, b) => a.order - b.order);
  }, [niveaux, searchQuery]);


  const filteredCycles = useMemo(() => {
    if (!searchQuery) return cycles.sort((a,b) => a.order - b.order);
    return cycles.filter(cycle => 
      cycle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cycle.code && cycle.code.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a,b) => a.order - b.order);
  }, [cycles, searchQuery]);


  const isLoading = schoolLoading || cyclesLoading || niveauxLoading || userLoading;
  
  const handleAddCycleSubmit = (values: CycleFormValues) => {
    if (!schoolId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'ID de l\'école non trouvé. Rechargez la page.' });
        return;
    }

    const dataToSave = { ...values, schoolId: schoolId, color: values.color || '#3b82f6' };
    const promise = editingCycle 
      ? setDoc(doc(firestore, `ecoles/${schoolId}/cycles/${editingCycle.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/cycles`), dataToSave);
    
    promise.then(() => {
      toast({ title: `Cycle ${editingCycle ? 'modifié' : 'créé'}`, description: `Le cycle "${values.name}" a été enregistré.`});
      setIsCycleFormOpen(false);
    }).catch(error => {
      const path = editingCycle ? `ecoles/${schoolId}/cycles/${editingCycle.id}` : `ecoles/${schoolId}/cycles`;
      const operation = editingCycle ? 'update' : 'create';
      const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleOpenCycleForm = (cycle: Cycle & {id: string} | null) => {
      setEditingCycle(cycle);
      cycleForm.reset(cycle ? {
        name: cycle.name,
        code: cycle.code,
        order: cycle.order,
        isActive: cycle.isActive ?? true,
        color: cycle.color || '#3b82f6'
      } : { name: '', code: '', order: cycles.length + 1, isActive: true, color: '#3b82f6' });
      setIsCycleFormOpen(true);
  }

  const handleAddNiveauSubmit = (values: NiveauFormValues) => {
    if (!schoolId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'ID de l\'école non trouvé. Rechargez la page.' });
        return;
    }
    const dataToSave = { ...values, schoolId: schoolId };

    const promise = editingNiveau 
        ? setDoc(doc(firestore, `ecoles/${schoolId}/niveaux/${editingNiveau.id}`), dataToSave, { merge: true })
        : addDoc(collection(firestore, `ecoles/${schoolId}/niveaux`), dataToSave);

    promise.then(() => {
        toast({ title: `Niveau ${editingNiveau ? 'modifié' : 'créé'}`, description: `Le niveau "${values.name}" a été enregistré.`});
        setIsNiveauFormOpen(false);
    }).catch(error => {
        const path = editingNiveau ? `ecoles/${schoolId}/niveaux/${editingNiveau.id}` : `ecoles/${schoolId}/niveaux`;
        const operation = editingNiveau ? 'update' : 'create';
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: values });
        errorEmitter.emit('permission-error', permissionError);
    });
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

      <Tabs defaultValue="cycles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="niveaux">Niveaux</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cycles" className="mt-6 space-y-6">
           <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestion des Cycles</CardTitle>
                  <CardDescription>
                    Définissez les cycles d'enseignement de votre établissement.
                  </CardDescription>
                </div>
                {canManageClasses && (
                  <Button onClick={() => handleOpenCycleForm(null)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Cycle
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader><TableRow><TableHead>Nom du Cycle</TableHead><TableHead>Code</TableHead><TableHead>Ordre</TableHead><TableHead>Statut</TableHead><TableHead className="text-right w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                    : filteredCycles.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun cycle trouvé</TableCell></TableRow>
                    : filteredCycles.map((cycle) => (
                          <TableRow key={cycle.id} className="group hover:bg-muted/50">
                            <TableCell className="font-medium"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: cycle.color || '#3b82f6' }} />{cycle.name}</div></TableCell>
                            <TableCell><Badge variant="outline">{cycle.code}</Badge></TableCell>
                            <TableCell>{cycle.order}</TableCell>
                            <TableCell><Badge variant={cycle.isActive ? 'secondary' : 'outline'}>{cycle.isActive ? 'Actif' : 'Inactif'}</Badge></TableCell>
                            <TableCell className="text-right">
                              {canManageClasses && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenCycleForm(cycle)}><Edit className="h-4 w-4" /></Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="niveaux" className="mt-6 space-y-6">
           <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestion des Niveaux</CardTitle>
                  <CardDescription>
                    Listes des niveaux d'enseignement, filtrables par cycle.
                  </CardDescription>
                </div>
                {canManageClasses && (
                  <Button onClick={() => handleOpenNiveauForm(null)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Niveau
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher un niveau..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader><TableRow><TableHead>Nom du Niveau</TableHead><TableHead>Code</TableHead><TableHead>Cycle</TableHead><TableHead>Ordre</TableHead><TableHead>Capacité</TableHead><TableHead className="text-right w-24">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                    : filteredNiveaux.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun niveau trouvé pour les filtres actuels</TableCell></TableRow>
                    : filteredNiveaux.map((niveau) => {
                      const cycle = cycleMap.get(niveau.cycleId);
                      return (
                        <TableRow key={niveau.id} className="group hover:bg-muted/50">
                          <TableCell className="font-medium">{niveau.name}</TableCell>
                          <TableCell><Badge variant="outline">{niveau.code}</Badge></TableCell>
                          <TableCell>
                            {cycle ? <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: cycle.color || '#3b82f6' }}/><span>{cycle.name}</span></div> : <Badge variant="destructive">N/A</Badge>}
                          </TableCell>
                          <TableCell>{niveau.order}</TableCell>
                          <TableCell>{niveau.capacity}</TableCell>
                          <TableCell className="text-right">
                             {canManageClasses && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenNiveauForm(niveau)}><Edit className="h-4 w-4" /></Button>
                                </div>
                             )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="classes" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Rechercher une classe..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>{viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}</Button>
                    {canManageClasses && (
                        <Button asChild><Link href="/dashboard/pedagogie/structure/new"><Plus className="mr-2 h-4 w-4" />Nouvelle Classe</Link></Button>
                    )}
                </div>
            </div>
            <Tabs defaultValue="all" onValueChange={setActiveCycleFilter}>
                <TabsList>
                    <TabsTrigger value="all">Toutes</TabsTrigger>
                    {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-24" />) : cycles.sort((a, b) => a.order - b.order).map(cycle => <TabsTrigger key={cycle.id} value={cycle.id}>{cycle.name}</TabsTrigger>)}
                </TabsList>
                <TabsContent value={activeCycleFilter} className="mt-6">
                    {viewMode === 'grid' ? <ClassesGridView cycleId={activeCycleFilter} searchQuery={searchQuery} /> : <ClassesListView cycleId={activeCycleFilter} searchQuery={searchQuery} />}
                </TabsContent>
            </Tabs>
        </TabsContent>
        
      </Tabs>
    </div>
    
    <Dialog open={isCycleFormOpen} onOpenChange={setIsCycleFormOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editingCycle ? 'Modifier' : 'Nouveau'} Cycle</DialogTitle></DialogHeader>
        <Form {...cycleForm}>
          <form id="cycle-form" onSubmit={cycleForm.handleSubmit(handleAddCycleSubmit)} className="space-y-4">
             <FormField
                control={cycleForm.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nom du cycle</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Sélectionnez un type de cycle..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {ivorianCycles.map((cycle) => (
                                    <SelectItem key={cycle.name} value={cycle.name}>{cycle.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
             />
             <FormField control={cycleForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={cycleForm.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre d'affichage</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={cycleForm.control} name="color" render={({ field }) => (<FormItem><FormLabel>Couleur</FormLabel><FormControl><Input type="color" {...field} className="h-10" /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={cycleForm.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Cycle Actif</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
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
             <FormField control={niveauForm.control} name="cycleId" render={({ field }) => (<FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un cycle" /></SelectTrigger></FormControl><SelectContent>{cycles.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
             <FormField 
                control={niveauForm.control} 
                name="name" 
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nom du niveau</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!watchedNiveauCycleId}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={!watchedNiveauCycleId ? "Choisissez d'abord un cycle" : "Sélectionnez un niveau"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {niveauxOptionsForSelectedCycle.map((niveau) => (
                                    <SelectItem key={niveau} value={niveau}>{niveau}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} 
            />
             <FormField control={niveauForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} readOnly={niveauxOptionsForSelectedCycle.length > 0} className={niveauxOptionsForSelectedCycle.length > 0 ? "bg-muted" : ""} /></FormControl><FormMessage /></FormItem>)} />
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

    

    
