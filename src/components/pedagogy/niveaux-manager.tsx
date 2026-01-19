
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import type { cycle as Cycle, niveau as Niveau, classe as Classe } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

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

const ivorianNiveaux = SCHOOL_TEMPLATES.IVORIAN_SYSTEM.niveaux;

export function NiveauxManager() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isDirectorOrAdmin = user?.profile?.permissions?.manageClasses;
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNiveau, setEditingNiveau] = useState<(Niveau & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<(Niveau & { id: string }) | null>(null);

  const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId, firestore]);
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId, firestore]);
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [schoolId, firestore]);

  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const cycles: (Cycle & {id: string})[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & {id: string})).sort((a,b) => a.order - b.order) || [], [cyclesData]);
  const niveaux: (Niveau & { id: string })[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & { id: string })) || [], [niveauxData]);
  const classes: (Classe & {id: string})[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Classe & {id: string})) || [], [classesData]);

  const niveauxByCycle = useMemo(() => {
    const grouped = cycles.map(cycle => ({
      ...cycle,
      niveaux: niveaux.filter(n => n.cycleId === cycle.id).sort((a,b) => a.order - b.order)
    }));
    return grouped;
  }, [cycles, niveaux]);
  
  const form = useForm<NiveauFormValues>({
    resolver: zodResolver(niveauSchema),
    defaultValues: { name: '', code: '', order: 1, cycleId: '', capacity: 30 }
  });

  const watchedNiveauCycleId = useWatch({ control: form.control, name: 'cycleId' });
  const watchedNiveauName = useWatch({ control: form.control, name: 'name' });
  
  const selectedCycleForNiveau = cycles.find(c => c.id === watchedNiveauCycleId);
  const niveauxOptionsForSelectedCycle = selectedCycleForNiveau ? ivorianNiveaux[selectedCycleForNiveau.name as keyof typeof ivorianNiveaux] || [] : [];
  
  useEffect(() => { form.setValue('name', ''); }, [watchedNiveauCycleId, form]);

  useEffect(() => {
    const selectedNiveauTemplate = niveauxOptionsForSelectedCycle.find(n => n === watchedNiveauName);
    if(selectedNiveauTemplate) {
        form.setValue('code', selectedNiveauTemplate.replace(/\s+/g, '').toUpperCase());
    }
  }, [watchedNiveauName, niveauxOptionsForSelectedCycle, form]);

  const handleFormSubmit = (values: NiveauFormValues) => {
    if (!schoolId) return;
    const promise = editingNiveau 
        ? setDoc(doc(firestore, `ecoles/${schoolId}/niveaux/${editingNiveau.id}`), values, { merge: true })
        : addDoc(collection(firestore, `ecoles/${schoolId}/niveaux`), values);
    promise.then(() => {
        toast({ title: `Niveau ${editingNiveau ? 'modifié' : 'créé'}` });
        setIsFormOpen(false);
    }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/niveaux`, operation: 'write', requestResourceData: values }));
    });
  };

  const handleOpenForm = (niveau: (Niveau & { id: string }) | null, cycleId?: string) => {
    setEditingNiveau(niveau);
    const defaultCycleId = cycleId || (cycles.length > 0 ? cycles[0].id : '');
    form.reset(niveau || { name: '', code: '', order: 1, cycleId: defaultCycleId, capacity: 30 });
    setIsFormOpen(true);
  };
  
  const handleDelete = async () => {
    if (!schoolId || !itemToDelete) return;
    const hasClasses = classes.some(c => c.niveauId === itemToDelete.id);
    if (hasClasses) {
        toast({ variant: 'destructive', title: 'Action impossible', description: 'Des classes sont encore rattachées à ce niveau.' });
        setIsDeleteDialogOpen(false);
        return;
    }
    await deleteDoc(doc(firestore, `ecoles/${schoolId}/niveaux`, itemToDelete.id));
    toast({ title: 'Niveau supprimé' });
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };
  
  const isLoading = schoolLoading || cyclesLoading || niveauxLoading || classesLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Niveaux Scolaires</CardTitle>
              <CardDescription>Gérez les niveaux au sein de chaque cycle.</CardDescription>
            </div>
            {isDirectorOrAdmin && <Button size="sm" onClick={() => handleOpenForm(null)}><PlusCircle className="mr-2 h-4 w-4"/>Nouveau Niveau</Button>}
          </div>
        </CardHeader>
        <CardContent>
           {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            ) : niveauxByCycle.length > 0 ? (
                <Accordion type="multiple" defaultValue={niveauxByCycle.map(c => c.id)} className="w-full space-y-2">
                    {niveauxByCycle.map(cycle => (
                        <AccordionItem value={cycle.id} key={cycle.id} className="border-b-0">
                             <AccordionTrigger className="p-3 bg-muted hover:bg-muted/80 rounded-t-lg hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: cycle.color}} />
                                        <span className="font-semibold">{cycle.name}</span>
                                    </div>
                                    {isDirectorOrAdmin && (
                                        <Button variant="ghost" size="sm" className="mr-2" onClick={(e) => { e.stopPropagation(); handleOpenForm(null, cycle.id); }}>
                                            <PlusCircle className="mr-2 h-4 w-4"/> Ajouter un niveau
                                        </Button>
                                    )}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="border border-t-0 rounded-b-lg p-0">
                                {cycle.niveaux.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                        <TableRow>
                                            <TableHead>Nom du Niveau</TableHead>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Ordre</TableHead>
                                            <TableHead>Capacité</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {cycle.niveaux.map(niveau => (
                                            <TableRow key={niveau.id}>
                                                <TableCell className="font-medium">{niveau.name}</TableCell>
                                                <TableCell>{niveau.code}</TableCell>
                                                <TableCell>{niveau.order}</TableCell>
                                                <TableCell>{niveau.capacity}</TableCell>
                                                <TableCell className="text-right">
                                                    {isDirectorOrAdmin && (
                                                    <>
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(niveau)}><Edit className="h-4 w-4"/></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => { setItemToDelete(niveau); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                    </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                     <p className="text-center text-muted-foreground py-4">Aucun niveau dans ce cycle.</p>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                 <div className="text-center h-24 flex items-center justify-center text-muted-foreground">Aucun cycle créé pour y ajouter des niveaux.</div>
            )}
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingNiveau ? 'Modifier' : 'Nouveau'} Niveau</DialogTitle></DialogHeader>
          <Form {...form}>
            <form id="niveau-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="cycleId" render={({ field }) => (<FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un cycle" /></SelectTrigger></FormControl><SelectContent>{cycles.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du niveau</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedNiveauCycleId}><FormControl><SelectTrigger><SelectValue placeholder={!watchedNiveauCycleId ? "Choisissez un cycle" : "Sélectionnez un niveau"} /></SelectTrigger></FormControl><SelectContent>{niveauxOptionsForSelectedCycle.map((niveau) => (<SelectItem key={niveau} value={niveau}>{niveau}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} readOnly={niveauxOptionsForSelectedCycle.length > 0} className={niveauxOptionsForSelectedCycle.length > 0 ? "bg-muted" : ""} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </form>
          </Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="niveau-form" disabled={form.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
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
