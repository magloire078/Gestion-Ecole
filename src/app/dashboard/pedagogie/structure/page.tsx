
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
    cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & {id: string})).sort((a, b) => a.order - b.order) || [], 
    [cyclesData]
  );
  
  const niveaux: (Niveau & {id: string})[] = useMemo(() => 
    niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & {id: string})) || [], 
    [niveauxData]
  );

  const niveauxByCycle = useMemo(() => {
    const grouped: Record<string, (Niveau & {id: string})[]> = {};
    for (const niveau of niveaux) {
        if (!grouped[niveau.cycleId]) {
            grouped[niveau.cycleId] = [];
        }
        grouped[niveau.cycleId].push(niveau);
    }
    // Sort niveaux within each cycle
    for(const cycleId in grouped) {
        grouped[cycleId].sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [niveaux]);

  const cycleForm = useForm<CycleFormValues>({
    resolver: zodResolver(cycleSchema),
    defaultValues: { name: '', code: '', order: cycles.length + 1, isActive: true, color: '#3b82f6' }
  });
  
  const niveauForm = useForm<NiveauFormValues>({
    resolver: zodResolver(niveauSchema),
    defaultValues: { name: '', code: '', order: 1, cycleId: '', capacity: 30 }
  });

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

  const handleOpenNiveauForm = (niveau: (Niveau & {id: string}) | null, cycleId?: string) => {
      setEditingNiveau(niveau);
      const defaultCycle = cycleId || (niveau ? niveau.cycleId : '');
      niveauForm.reset(niveau ? {
          ...niveau,
          capacity: niveau.capacity || 30,
          ageMin: niveau.ageMin || undefined,
          ageMax: niveau.ageMax || undefined,
      } : { name: '', code: '', order: 1, cycleId: defaultCycle, capacity: 30 });
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
        <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenCycleForm(null)}>Nouveau Cycle</Button>
            <Button variant="outline" size="sm" onClick={() => handleOpenNiveauForm(null)}>Nouveau Niveau</Button>
        </div>

      <Accordion type="multiple" defaultValue={cycles.map(c => c.id)} className="w-full space-y-4">
        {cycles.map(cycle => (
          <AccordionItem value={cycle.id} key={cycle.id} className="border-0">
             <Card>
                <AccordionTrigger className="p-4 hover:no-underline">
                   <div className="flex justify-between items-center w-full">
                       <div className="flex items-center gap-4">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cycle.color || '#3b82f6' }} />
                           <h3 className="text-lg font-semibold">{cycle.name}</h3>
                           <Badge variant="outline">{cycle.code}</Badge>
                           <Badge variant={cycle.isActive ? 'secondary' : 'outline'}>{cycle.isActive ? 'Actif' : 'Inactif'}</Badge>
                       </div>
                       {canManageClasses && (
                        <div className="flex items-center gap-2 pr-4">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenCycleForm(cycle) }}><Edit className="h-4 w-4" /></Button>
                        </div>
                       )}
                   </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="p-4 pt-0">
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Niveau</TableHead><TableHead>Code</TableHead><TableHead>Capacité</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                        </TableHeader>
                         <TableBody>
                             {(niveauxByCycle[cycle.id] || []).map(niveau => (
                                 <TableRow key={niveau.id} className="group">
                                    <TableCell>{niveau.name}</TableCell>
                                    <TableCell><Badge variant="outline">{niveau.code}</Badge></TableCell>
                                    <TableCell>{niveau.capacity}</TableCell>
                                    <TableCell className="text-right">
                                         {canManageClasses && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenNiveauForm(niveau)}><Edit className="h-4 w-4" /></Button>
                                            </div>
                                        )}
                                    </TableCell>
                                 </TableRow>
                             ))}
                              {(!niveauxByCycle[cycle.id] || niveauxByCycle[cycle.id].length === 0) && (
                                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Aucun niveau dans ce cycle.</TableCell></TableRow>
                              )}
                         </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
             </Card>
          </AccordionItem>
        ))}
      </Accordion>
      
      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Toutes les Classes</CardTitle>
                  <CardDescription>
                    Vue d'ensemble de toutes les classes de l'établissement.
                  </CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>{viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}</Button>
                    {canManageClasses && (
                        <Button asChild><Link href="/dashboard/pedagogie/structure/new"><Plus className="mr-2 h-4 w-4" />Nouvelle Classe</Link></Button>
                    )}
                </div>
            </div>
            <div className="relative flex-1 mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher une classe..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-64" /> : viewMode === 'grid' ? <ClassesGridView cycleId="all" searchQuery={searchQuery} /> : <ClassesListView cycleId="all" searchQuery={searchQuery} />}
        </CardContent>
      </Card>
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
             <FormField control={niveauForm.control} name="cycleId" render={({ field }) => (<FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un cycle" /></SelectTrigger></FormControl><SelectContent>{cycles.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
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
