'use client';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { PlusCircle, Edit, Trash2, GraduationCap } from 'lucide-react';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import type { cycle as Cycle, niveau as Niveau, classe as Classe } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Badge } from '../ui/badge';

const niveauSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  code: z.string().min(1, "Le code est requis.").max(10),
  order: z.coerce.number().min(1, "L'ordre est requis."),
  cycleId: z.string().min(1, 'Le cycle est requis.'),
  capacity: z.coerce.number().min(1, 'La capacité est requise.'),
  ageMin: z.coerce.number().optional(),
  ageMax: z.coerce.number().optional(),
});
type NiveauFormValues = z.infer<typeof niveauSchema>;

export function NiveauxManager() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isDirectorOrAdmin = !!user?.profile?.permissions?.manageClasses || user?.profile?.role === 'directeur';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNiveau, setEditingNiveau] = useState<(Niveau & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<(Niveau & { id: string }) | null>(null);
  const [selectedCycle, setSelectedCycle] = useState('all');

  const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId, firestore]);
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId, firestore]);
  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [schoolId, firestore]);
  
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const cycles = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & { id: string })).sort((a,b) => a.order - b.order) || [], [cyclesData]);
  const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & { id: string })).sort((a,b) => a.order - b.order) || [], [niveauxData]);
  const classes = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Classe & { id: string })) || [], [classesData]);

  const filteredNiveaux = useMemo(() => {
    if (selectedCycle === 'all') return niveaux;
    return niveaux.filter(n => n.cycleId === selectedCycle);
  }, [niveaux, selectedCycle]);

  const cycleMap = useMemo(() => new Map(cycles.map(c => [c.id, c.name])), [cycles]);

  const form = useForm<NiveauFormValues>({
    resolver: zodResolver(niveauSchema),
    defaultValues: { name: '', code: '', order: 1, cycleId: '', capacity: 30 }
  });

  const watchedCycleId = useWatch({ control: form.control, name: 'cycleId' });
  const watchedNiveauName = useWatch({ control: form.control, name: 'name' });
  
  const niveauxOptions = useMemo(() => {
    const cycle = cycles.find(c => c.id === watchedCycleId);
    if (!cycle) return [];
    return SCHOOL_TEMPLATES.IVORIAN_SYSTEM.niveaux[cycle.name as keyof typeof SCHOOL_TEMPLATES.IVORIAN_SYSTEM.niveaux] || [];
  }, [watchedCycleId, cycles]);

  useEffect(() => {
    const selectedNiveauTemplate = niveauxOptions.find(n => n === watchedNiveauName);
    if(selectedNiveauTemplate) {
      form.setValue('code', selectedNiveauTemplate.replace(/\s+/g, '').toUpperCase());
    }
  }, [watchedNiveauName, niveauxOptions, form]);

  const handleFormSubmit = (values: NiveauFormValues) => {
    if (!schoolId) return;
    const dataToSave = { ...values, schoolId };
    const promise = editingNiveau 
      ? setDoc(doc(firestore, `ecoles/${schoolId}/niveaux/${editingNiveau.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/niveaux`), dataToSave);
    
    promise.then(() => {
      toast({ title: `Niveau ${editingNiveau ? 'modifié' : 'créé'}` });
      setIsFormOpen(false);
    }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/niveaux`, operation: 'write', requestResourceData: dataToSave }));
    });
  };
  
  const handleOpenForm = (niveau: (Niveau & { id: string }) | null, cycleId?: string) => {
    setEditingNiveau(niveau);
    const defaultCycleId = cycleId || (cycles.length > 0 ? cycles[0].id : '');
    form.reset(niveau || { name: '', code: '', order: niveaux.length + 1, cycleId: defaultCycleId, capacity: 30 });
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!schoolId || !itemToDelete) return;
    if (classes.some(c => c.niveauId === itemToDelete.id)) {
        toast({ variant: 'destructive', title: 'Action impossible', description: 'Des classes sont encore rattachées à ce niveau.'});
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
             <div className="flex items-center gap-2">
                 <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrer par cycle" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les cycles</SelectItem>
                        {cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {isDirectorOrAdmin && <Button size="sm" onClick={() => handleOpenForm(null)}><PlusCircle className="mr-2 h-4 w-4"/>Nouveau Niveau</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
            ) : filteredNiveaux.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNiveaux.map(niveau => (
                        <Card key={niveau.id} className="group">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary"/>{niveau.name}</CardTitle>
                                        <CardDescription>{cycleMap.get(niveau.cycleId) || 'N/A'}</CardDescription>
                                    </div>
                                    <Badge variant="outline">{niveau.code}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Capacité maximale: {niveau.capacity} élèves</p>
                            </CardContent>
                            <CardContent>
                                {isDirectorOrAdmin && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(niveau)}><Edit className="h-3 w-3 mr-1"/>Modifier</Button>
                                        <Button variant="destructive" size="sm" onClick={() => { setItemToDelete(niveau); setIsDeleteDialogOpen(true); }}><Trash2 className="h-3 w-3 mr-1"/>Supprimer</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center h-24 flex items-center justify-center text-muted-foreground">Aucun niveau créé pour ce cycle.</div>
            )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingNiveau ? 'Modifier' : 'Nouveau'} Niveau</DialogTitle></DialogHeader>
          <Form {...form}>
            <form id="niveau-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="cycleId" render={({ field }) => (<FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger></FormControl><SelectContent>{cycles.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du niveau *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedCycleId}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger></FormControl><SelectContent>{niveauxOptions.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacité max.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </form>
          </Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="niveau-form" disabled={form.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle><AlertDialogDescription>L'élément <strong>"{itemToDelete?.name}"</strong> sera supprimé. Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
