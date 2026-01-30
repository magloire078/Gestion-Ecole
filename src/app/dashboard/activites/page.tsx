'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Trophy } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, addDoc, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { activite as Activite, staff as Staff } from '@/lib/data-types';

const activiteSchema = z.object({
  name: z.string().min(2, "Le nom de l'activité est requis."),
  type: z.enum(['sportive', 'culturelle', 'club']),
  teacherInChargeId: z.string().min(1, "Le responsable est requis."),
  description: z.string().optional(),
  schedule: z.string().optional(),
});
type ActiviteFormValues = z.infer<typeof activiteSchema>;

export default function GestionActivitesPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageActivities = !!user?.profile?.permissions?.manageActivities;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivite, setEditingActivite] = useState<(Activite & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activiteToDelete, setActiviteToDelete] = useState<(Activite & { id: string }) | null>(null);
  
  const activitesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/activites`)) : null, [firestore, schoolId]);
  const { data: activitesData, loading: activitesLoading } = useCollection(activitesQuery);
  const activites: (Activite & { id: string })[] = useMemo(() => activitesData?.map(d => ({ id: d.id, ...d.data() } as Activite & { id: string })) || [], [activitesData]);

  const teachersQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);
  const teachers: (Staff & { id: string })[] = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`])), [teachers]);

  const form = useForm<ActiviteFormValues>({
    resolver: zodResolver(activiteSchema),
    defaultValues: { type: 'sportive', name: '', description: '', schedule: '', teacherInChargeId: '' },
  });

  const handleFormSubmit = async (values: ActiviteFormValues) => {
    if (!schoolId) return;
    const collectionRef = collection(firestore, `ecoles/${schoolId}/activites`);
    const promise = editingActivite
      ? setDoc(doc(collectionRef, editingActivite.id), values, { merge: true })
      : addDoc(collectionRef, values);
    try {
      await promise;
      toast({ title: `Activité ${editingActivite ? 'modifiée' : 'ajoutée'}`});
      setIsFormOpen(false);
    } catch (e) {
      console.error("Error saving activity:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer l\'activité.' });
    }
  };
  
  const handleOpenDeleteDialog = (activite: Activite & { id: string }) => {
    setActiviteToDelete(activite);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteActivite = async () => {
    if (!schoolId || !activiteToDelete) return;
    const docRef = doc(firestore, `ecoles/${schoolId}/activites`, activiteToDelete.id);
    try {
        await deleteDoc(docRef);
        toast({ title: 'Activité supprimée' });
    } catch (error) {
        console.error("Error deleting activity:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer l\'activité.' });
    } finally {
        setIsDeleteDialogOpen(false);
        setActiviteToDelete(null);
    }
  };

  const isLoading = schoolLoading || activitesLoading || teachersLoading;

  return (
    <>
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Liste des activités</h2>
          {canManageActivities && (
            <Button onClick={() => { setEditingActivite(null); form.reset({ type: 'sportive', name: '', description: '', schedule: '', teacherInChargeId: '' }); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter une activité
            </Button>
          )}
      </div>
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)
        ) : activites.length > 0 ? (
          activites.map(activite => (
            <Card key={activite.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Trophy className="h-8 w-8 text-amber-500" />
                  {canManageActivities && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingActivite(activite); form.reset(activite); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(activite)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <CardTitle>{activite.name}</CardTitle>
                <CardDescription className="capitalize">{activite.type}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1"><p className="text-sm text-muted-foreground">{activite.description}</p></CardContent>
              <CardFooter className="flex flex-col items-start text-sm">
                 <p><span className="font-semibold">Responsable:</span> {teacherMap.get(activite.teacherInChargeId) || 'N/A'}</p>
                 <p><span className="font-semibold">Horaire:</span> {activite.schedule || 'Non défini'}</p>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full"><Card className="flex items-center justify-center h-48"><p className="text-muted-foreground">Aucune activité créée.</p></Card></div>
        )}
      </div>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingActivite ? 'Modifier' : 'Ajouter'} une activité</DialogTitle></DialogHeader>
          <Form {...form}><form id="activite-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="sportive">Sportive</SelectItem><SelectItem value="culturelle">Culturelle</SelectItem><SelectItem value="club">Club</SelectItem></SelectContent></Select></FormItem>} />
              <FormField control={form.control} name="teacherInChargeId" render={({ field }) => <FormItem><FormLabel>Responsable</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger></FormControl><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
              <FormField control={form.control} name="schedule" render={({ field }) => <FormItem><FormLabel>Horaire</FormLabel><FormControl><Input placeholder="Ex: Mardi 16h-17h" {...field} /></FormControl></FormItem>} />
          </form></Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="activite-form" disabled={form.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. L'activité <strong>"{activiteToDelete?.name}"</strong> sera définitivement supprimée.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteActivite} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
