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
import { collection, query, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import type { cycle as Cycle, niveau as Niveau } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<(Cycle & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<(Cycle & { id: string }) | null>(null);

  const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId, firestore]);
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId, firestore]);

  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);

  const cycles: (Cycle & { id: string })[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & { id: string })).sort((a, b) => a.order - b.order) || [], [cyclesData]);
  const niveaux: (Niveau & { id: string })[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & { id: string })) || [], [niveauxData]);
  
  const niveauxCountByCycle = useMemo(() => {
    return niveaux.reduce((acc, niveau) => {
        if (niveau.cycleId) {
            acc[niveau.cycleId] = (acc[niveau.cycleId] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);
  }, [niveaux]);


  const form = useForm<CycleFormValues>({
    resolver: zodResolver(cycleSchema),
    defaultValues: { name: '', code: '', order: cycles.length + 1, isActive: true, color: '#3b82f6' }
  });

  const watchedCycleName = useWatch({ control: form.control, name: 'name' });
  
  useEffect(() => {
    const selectedCycleTemplate = ivorianCycles.find(c => c.name === watchedCycleName);
    if (selectedCycleTemplate) {
        form.setValue('code', selectedCycleTemplate.code);
        form.setValue('order', selectedCycleTemplate.order);
    }
  }, [watchedCycleName, form]);

  const handleFormSubmit = (values: CycleFormValues) => {
    if (!schoolId) return;

    const dataToSave = { ...values, schoolId };
    const promise = editingCycle 
      ? setDoc(doc(firestore, `ecoles/${schoolId}/cycles/${editingCycle.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/cycles`), dataToSave);
    
    promise.then(() => {
      toast({ title: `Cycle ${editingCycle ? 'modifié' : 'créé'}` });
      setIsFormOpen(false);
    }).catch(error => {
      const path = editingCycle ? `ecoles/${schoolId}/cycles/${editingCycle.id}` : `ecoles/${schoolId}/cycles`;
      const operation = editingCycle ? 'update' : 'create';
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation, requestResourceData: dataToSave }));
    });
  };
  
  const handleOpenForm = (cycle: (Cycle & { id: string }) | null) => {
    setEditingCycle(cycle);
    form.reset(cycle || { name: '', code: '', order: cycles.length + 1, isActive: true, color: '#3b82f6' });
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!schoolId || !itemToDelete) return;
    if ((niveauxCountByCycle[itemToDelete.id] || 0) > 0) {
        toast({ variant: 'destructive', title: 'Action impossible', description: 'Veuillez d\'abord supprimer tous les niveaux de ce cycle.' });
        setIsDeleteDialogOpen(false);
        return;
    }
    await deleteDoc(doc(firestore, `ecoles/${schoolId}/cycles`, itemToDelete.id));
    toast({ title: 'Cycle supprimé' });
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const isLoading = schoolLoading || cyclesLoading || niveauxLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Cycles d'Enseignement</CardTitle>
                <CardDescription>Gérez les grands ensembles de votre structure pédagogique.</CardDescription>
            </div>
            {isDirectorOrAdmin && <Button size="sm" onClick={() => handleOpenForm(null)}><PlusCircle className="mr-2 h-4 w-4"/>Nouveau Cycle</Button>}
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : cycles.length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-2">
                    {cycles.map(cycle => (
                    <AccordionItem value={cycle.id} key={cycle.id} className="border-b-0">
                        <AccordionTrigger className="p-3 bg-muted hover:bg-muted/80 rounded-lg hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: cycle.color}} />
                                    <span className="font-semibold">{cycle.name}</span>
                                    <Badge variant="outline">{cycle.code}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mr-2">
                                    <span>{niveauxCountByCycle[cycle.id] || 0} Niveaux</span>
                                    <Badge variant={cycle.isActive ? 'secondary' : 'outline'}>{cycle.isActive ? 'Actif' : 'Inactif'}</Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pl-10">
                            <p className="text-sm text-muted-foreground">Ordre d'affichage: {cycle.order}</p>
                            {isDirectorOrAdmin && (
                                <div className="mt-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenForm(cycle)}><Edit className="h-4 w-4 mr-2"/>Modifier</Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setItemToDelete(cycle); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2"/>Supprimer</Button>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="text-center h-24 flex items-center justify-center text-muted-foreground">Aucun cycle créé.</div>
              )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCycle ? 'Modifier' : 'Nouveau'} Cycle</DialogTitle></DialogHeader>
          <Form {...form}>
            <form id="cycle-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nom du cycle</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un type..." /></SelectTrigger></FormControl><SelectContent>{ivorianCycles.map((cycle) => (<SelectItem key={cycle.name} value={cycle.name}>{cycle.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="color" render={({ field }) => (<FormItem><FormLabel>Couleur</FormLabel><FormControl><Input type="color" {...field} className="h-10" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Actif</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            </form>
          </Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="cycle-form" disabled={form.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>L'élément <strong>"{itemToDelete?.name}"</strong> sera supprimé. Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
