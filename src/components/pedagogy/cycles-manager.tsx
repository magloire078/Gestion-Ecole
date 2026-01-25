'use client';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, addDoc, doc, setDoc, deleteDoc, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2, GraduationCap } from 'lucide-react';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import type { cycle as Cycle, niveau as Niveau, classe as Classe } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NiveauForm } from './niveau-form';

const cycleSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  code: z.string().min(2, "Le code est requis.").max(5, "Le code ne peut excéder 5 caractères."),
  order: z.coerce.number().min(1, "L'ordre est requis."),
  isActive: z.boolean().default(true),
  color: z.string().optional(),
});
type CycleFormValues = z.infer<typeof cycleSchema>;

const ivorianCycles = SCHOOL_TEMPLATES.IVORIAN_SYSTEM.cycles;

export function CyclesManager() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isDirectorOrAdmin = !!user?.profile?.permissions?.manageClasses || user?.profile?.role === 'directeur';

  const [isCycleFormOpen, setIsCycleFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<(Cycle & { id: string }) | null>(null);
  const [isCycleDeleteOpen, setIsCycleDeleteOpen] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState<(Cycle & { id: string }) | null>(null);

  const [isNiveauFormOpen, setIsNiveauFormOpen] = useState(false);
  const [editingNiveau, setEditingNiveau] = useState<(Niveau & { id: string }) | null>(null);
  const [isNiveauDeleteOpen, setIsNiveauDeleteOpen] = useState(false);
  const [niveauToDelete, setNiveauToDelete] = useState<(Niveau & { id: string }) | null>(null);
  const [currentCycleForNiveau, setCurrentCycleForNiveau] = useState<string | undefined>(undefined);

  const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId, firestore]);
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId, firestore]);
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [schoolId, firestore]);

  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const cycles: (Cycle & { id: string })[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & { id: string })).sort((a, b) => a.order - b.order) || [], [cyclesData]);
  const niveaux: (Niveau & { id: string })[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & { id: string })).sort((a,b) => a.order - b.order) || [], [niveauxData]);
  const classes: (Classe & { id: string })[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Classe & { id: string })) || [], [classesData]);

  const niveauxByCycle = useMemo(() => {
    return niveaux.reduce((acc, niveau) => {
        if (niveau.cycleId) {
            if (!acc[niveau.cycleId]) acc[niveau.cycleId] = [];
            acc[niveau.cycleId].push(niveau);
        }
        return acc;
    }, {} as Record<string, (Niveau & { id: string })[]>);
  }, [niveaux]);

  const cycleForm = useForm<CycleFormValues>({
    resolver: zodResolver(cycleSchema),
    defaultValues: { name: '', code: '', order: cycles.length + 1, isActive: true, color: '#3b82f6' }
  });

  const watchedCycleName = useWatch({ control: cycleForm.control, name: 'name' });
  
  useEffect(() => {
    const selectedCycleTemplate = ivorianCycles.find(c => c.name === watchedCycleName);
    if (selectedCycleTemplate) {
        cycleForm.setValue('code', selectedCycleTemplate.code);
        cycleForm.setValue('order', selectedCycleTemplate.order);
    }
  }, [watchedCycleName, cycleForm]);

  const handleCycleFormSubmit = (values: CycleFormValues) => {
    if (!schoolId) return;

    const dataToSave = { ...values, schoolId };
    const promise = editingCycle 
      ? setDoc(doc(firestore, `ecoles/${schoolId}/cycles/${editingCycle.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/cycles`), dataToSave);
    
    promise.then(() => {
      toast({ title: `Cycle ${editingCycle ? 'modifié' : 'créé'}` });
      setIsCycleFormOpen(false);
    }).catch(error => {
      const path = editingCycle ? `ecoles/${schoolId}/cycles/${editingCycle.id}` : `ecoles/${schoolId}/cycles`;
      const operation = editingCycle ? 'update' : 'create';
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation, requestResourceData: dataToSave }));
    });
  };
  
  const handleOpenCycleForm = (cycle: (Cycle & { id: string }) | null) => {
    setEditingCycle(cycle);
    cycleForm.reset(cycle || { name: '', code: '', order: cycles.length + 1, isActive: true, color: '#3b82f6' });
    setIsCycleFormOpen(true);
  };
  
  const handleOpenNiveauForm = (niveau: (Niveau & { id: string }) | null, cycleId: string) => {
    setEditingNiveau(niveau);
    setCurrentCycleForNiveau(cycleId);
    setIsNiveauFormOpen(true);
  };

  const handleDeleteCycle = async () => {
    if (!schoolId || !cycleToDelete) return;
    if ((niveauxByCycle[cycleToDelete.id] || []).length > 0) {
        toast({ variant: 'destructive', title: 'Action impossible', description: 'Veuillez d\'abord supprimer tous les niveaux de ce cycle.' });
        setIsCycleDeleteOpen(false);
        return;
    }
    await deleteDoc(doc(firestore, `ecoles/${schoolId}/cycles`, cycleToDelete.id));
    toast({ title: 'Cycle supprimé' });
    setIsCycleDeleteOpen(false);
    setCycleToDelete(null);
  };
  
   const handleDeleteNiveau = async () => {
    if (!schoolId || !niveauToDelete) return;
    if (classes.some(c => c.niveauId === niveauToDelete.id)) {
        toast({ variant: 'destructive', title: 'Action impossible', description: 'Des classes sont encore rattachées à ce niveau.'});
        setIsNiveauDeleteOpen(false);
        return;
    }
    await deleteDoc(doc(firestore, `ecoles/${schoolId}/niveaux`, niveauToDelete.id));
    toast({ title: 'Niveau supprimé' });
    setIsNiveauDeleteOpen(false);
    setNiveauToDelete(null);
  };

  const isLoading = schoolLoading || cyclesLoading || niveauxLoading || classesLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Cycles & Niveaux</CardTitle>
                <CardDescription>Gérez la structure pédagogique de votre établissement.</CardDescription>
            </div>
            {isDirectorOrAdmin && <Button size="sm" onClick={() => handleOpenCycleForm(null)}><PlusCircle className="mr-2 h-4 w-4"/>Nouveau Cycle</Button>}
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : cycles.length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-2" defaultValue={cycles.map(c => c.id)}>
                    {cycles.map(cycle => (
                    <AccordionItem value={cycle.id} key={cycle.id} className="border rounded-lg bg-muted/30">
                        <AccordionTrigger className="p-3 hover:bg-muted/80 rounded-lg hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: cycle.color}} />
                                    <span className="font-semibold">{cycle.name}</span>
                                    <Badge variant="outline">{cycle.code}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mr-2">
                                    <span>{(niveauxByCycle[cycle.id] || []).length} Niveaux</span>
                                    <Badge variant={cycle.isActive ? 'secondary' : 'outline'}>{cycle.isActive ? 'Actif' : 'Inactif'}</Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 px-4 pb-4">
                           {isDirectorOrAdmin && (
                                <div className="border-b mb-3 pb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenCycleForm(cycle)}><Edit className="h-4 w-4 mr-2"/>Modifier le cycle</Button>
                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setCycleToDelete(cycle); setIsCycleDeleteOpen(true); }}><Trash2 className="h-4 w-4 mr-2"/>Supprimer le cycle</Button>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handleOpenNiveauForm(null, cycle.id)}><PlusCircle className="h-4 w-4 mr-2"/>Ajouter un niveau</Button>
                                </div>
                            )}
                            <div className="space-y-2">
                                {(niveauxByCycle[cycle.id] || []).length > 0 ? (niveauxByCycle[cycle.id].map(niveau => (
                                    <div key={niveau.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-background">
                                        <div className="flex items-center gap-3">
                                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                            <span>{niveau.name}</span>
                                            <Badge variant="outline" className="font-mono text-xs">{niveau.code}</Badge>
                                        </div>
                                         {isDirectorOrAdmin && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenNiveauForm(niveau, cycle.id)}><Edit className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setNiveauToDelete(niveau); setIsNiveauDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </div>
                                         )}
                                    </div>
                                ))) : (
                                    <p className="text-sm text-center text-muted-foreground py-4">Aucun niveau dans ce cycle.</p>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="text-center h-24 flex items-center justify-center text-muted-foreground">Aucun cycle créé.</div>
              )}
        </CardContent>
      </Card>

      <Dialog open={isCycleFormOpen} onOpenChange={setIsCycleFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCycle ? 'Modifier' : 'Nouveau'} Cycle</DialogTitle></DialogHeader>
          <Form {...cycleForm}>
            <form id="cycle-form" onSubmit={cycleForm.handleSubmit(handleCycleFormSubmit)} className="space-y-4">
              <FormField control={cycleForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nom du cycle</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un type..." /></SelectTrigger></FormControl><SelectContent>{ivorianCycles.map((cycle) => (<SelectItem key={cycle.name} value={cycle.name}>{cycle.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={cycleForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={cycleForm.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={cycleForm.control} name="color" render={({ field }) => (<FormItem><FormLabel>Couleur</FormLabel><FormControl><Input type="color" {...field} className="h-10" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={cycleForm.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Actif</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            </form>
          </Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsCycleFormOpen(false)}>Annuler</Button><Button type="submit" form="cycle-form" disabled={cycleForm.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isNiveauFormOpen} onOpenChange={setIsNiveauFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingNiveau ? 'Modifier' : 'Nouveau'} Niveau</DialogTitle></DialogHeader>
           <NiveauForm 
                schoolId={schoolId!}
                cycles={cycles}
                niveaux={niveaux}
                niveau={editingNiveau}
                defaultCycleId={currentCycleForNiveau}
                onSave={() => setIsNiveauFormOpen(false)}
           />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isCycleDeleteOpen} onOpenChange={setIsCycleDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>Le cycle <strong>"{cycleToDelete?.name}"</strong> sera supprimé. Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteCycle} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isNiveauDeleteOpen} onOpenChange={setIsNiveauDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>Le niveau <strong>"{niveauToDelete?.name}"</strong> sera supprimé. Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteNiveau} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
