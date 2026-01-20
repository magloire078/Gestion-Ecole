
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { subject as Subject } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const subjectSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  code: z.string().min(2, "Le code est requis.").max(10, "Le code ne peut excéder 10 caractères."),
  color: z.string().optional(),
});
type SubjectFormValues = z.infer<typeof subjectSchema>;


export function SubjectsManager() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isDirectorOrAdmin = user?.profile?.permissions?.manageClasses;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<(Subject & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<(Subject & { id: string }) | null>(null);

  const subjectsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/matieres`)) : null, [schoolId, firestore]);
  const { data: subjectsData, loading: subjectsLoading } = useCollection(subjectsQuery);

  const subjects: (Subject & { id: string })[] = useMemo(() => subjectsData?.map(d => ({ id: d.id, ...d.data() } as Subject & { id: string })) || [], [subjectsData]);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: '', code: '', color: '#8B5CF6' }
  });
  
  useEffect(() => {
    form.reset(editingSubject || { name: '', code: '', color: '#8B5CF6' });
  }, [isFormOpen, editingSubject, form]);
  
  const handleFormSubmit = (values: SubjectFormValues) => {
    if (!schoolId) return;

    const dataToSave = { ...values, schoolId };
    const promise = editingSubject 
      ? setDoc(doc(firestore, `ecoles/${schoolId}/matieres/${editingSubject.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/matieres`), dataToSave);
    
    promise.then(() => {
      toast({ title: `Matière ${editingSubject ? 'modifiée' : 'créée'}` });
      setIsFormOpen(false);
    }).catch(error => {
      const path = editingSubject ? `ecoles/${schoolId}/matieres/${editingSubject.id}` : `ecoles/${schoolId}/matieres`;
      const operation = editingSubject ? 'update' : 'create';
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation, requestResourceData: dataToSave }));
    });
  };
  
  const handleOpenForm = (subject: (Subject & { id: string }) | null) => {
    setEditingSubject(subject);
    setIsFormOpen(true);
  };
  
  const handleDelete = async () => {
    if (!schoolId || !itemToDelete) return;
    await deleteDoc(doc(firestore, `ecoles/${schoolId}/matieres`, itemToDelete.id));
    toast({ title: 'Matière supprimée' });
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const isLoading = schoolLoading || subjectsLoading;

  return (
      <>
        <Card>
            <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Matières Enseignées</CardTitle>
                    <CardDescription>Gérez les matières proposées dans votre établissement.</CardDescription>
                </div>
                {isDirectorOrAdmin && <Button size="sm" onClick={() => handleOpenForm(null)}><PlusCircle className="mr-2 h-4 w-4"/>Nouvelle Matière</Button>}
            </div>
            </CardHeader>
            <CardContent>
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            ) : subjects.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {subjects.map(subject => (
                        <div key={subject.id} className="group flex items-center justify-between p-3 rounded-lg border">
                           <div className="flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full" style={{backgroundColor: subject.color}} />
                             <span className="font-semibold">{subject.name}</span>
                           </div>
                           {isDirectorOrAdmin && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenForm(subject)}><Edit className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setItemToDelete(subject); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                           )}
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center h-24 flex items-center justify-center text-muted-foreground">Aucune matière créée.</div>
            )}
            </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{editingSubject ? 'Modifier' : 'Nouvelle'} Matière</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form id="subject-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Nom de la matière</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="color" render={({ field }) => (<FormItem><FormLabel>Couleur</FormLabel><FormControl><Input type="color" {...field} className="h-10" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </form>
                </Form>
                <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="subject-form" disabled={form.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                    <AlertDialogDescription>La matière <strong>"{itemToDelete?.name}"</strong> sera supprimée.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
  )
}
