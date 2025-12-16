
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, addDoc, setDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { tache_maintenance as TacheMaintenance, staff } from '@/lib/data-types';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

const tacheSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  priority: z.enum(['basse', 'moyenne', 'haute']),
  status: z.enum(['à_faire', 'en_cours', 'terminée']),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
});

type TacheFormValues = z.infer<typeof tacheSchema>;

export default function MaintenancePage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageContent;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTache, setEditingTache] = useState<(TacheMaintenance & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tacheToDelete, setTacheToDelete] = useState<(TacheMaintenance & { id: string }) | null>(null);

  const tachesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/maintenance`), orderBy('createdAt', 'desc')) : null, [firestore, schoolId]);
  const { data: tachesData, loading: tachesLoading } = useCollection(tachesQuery);
  const taches: (TacheMaintenance & { id: string })[] = useMemo(() => tachesData?.map(d => ({ id: d.id, ...d.data() } as TacheMaintenance & { id: string })) || [], [tachesData]);
  
  const staffQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staffMembers: (staff & { id: string })[] = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as staff & { id: string })) || [], [staffData]);
  
  const staffMap = useMemo(() => new Map(staffMembers.map(s => [s.id, `${s.firstName} ${s.lastName}`])), [staffMembers]);

  const form = useForm<TacheFormValues>({
    resolver: zodResolver(tacheSchema),
    defaultValues: { priority: "moyenne", status: "à_faire" },
  });

  useEffect(() => {
    form.reset(
      editingTache 
        ? { ...editingTache, dueDate: editingTache.dueDate ? format(new Date(editingTache.dueDate), 'yyyy-MM-dd') : '' }
        : { priority: 'moyenne', status: 'à_faire', title: '', description: '', location: '', assignedTo: '' }
    );
  }, [isFormOpen, editingTache, form]);

  const handleFormSubmit = async (values: TacheFormValues) => {
    if (!schoolId) return;

    const dataToSave: any = { ...values, schoolId };
    if (!editingTache) {
        dataToSave.createdAt = new Date().toISOString();
    }
    
    const promise = editingTache
      ? setDoc(doc(firestore, `ecoles/${schoolId}/maintenance/${editingTache.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/maintenance`), dataToSave);

    try {
      await promise;
      toast({ title: `Tâche ${editingTache ? 'modifiée' : 'créée'}`, description: `La tâche "${values.title}" a été enregistrée.` });
      setIsFormOpen(false);
    } catch (error) {
      const path = `ecoles/${schoolId}/maintenance/${editingTache?.id || '(new)'}`;
      const operation = editingTache ? 'update' : 'create';
      const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleOpenDeleteDialog = (tache: TacheMaintenance & { id: string }) => {
    setTacheToDelete(tache);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteTache = async () => {
    if (!schoolId || !tacheToDelete) return;
    try {
      await deleteDoc(doc(firestore, `ecoles/${schoolId}/maintenance`, tacheToDelete.id));
      toast({ title: "Tâche supprimée", description: `La tâche "${tacheToDelete.title}" a été supprimée.` });
    } catch (error) {
       const permissionError = new FirestorePermissionError({ path: `ecoles/${schoolId}/maintenance/${tacheToDelete.id}`, operation: 'delete' });
       errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleteDialogOpen(false);
        setTacheToDelete(null);
    }
  };
  
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch(status) {
        case 'à_faire': return 'outline';
        case 'en_cours': return 'secondary';
        case 'terminée': return 'default';
        default: return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch(priority) {
        case 'basse': return 'default';
        case 'moyenne': return 'secondary';
        case 'haute': return 'destructive';
        default: return 'default';
    }
  };
  
  const isLoading = schoolLoading || tachesLoading || staffLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Suivi de la Maintenance</CardTitle>
              <CardDescription>Gérez les tâches de maintenance préventive et corrective.</CardDescription>
            </div>
            {canManageContent && (
              <Button onClick={() => { setEditingTache(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Tâche
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Priorité</TableHead><TableHead>Statut</TableHead><TableHead>Assigné à</TableHead><TableHead>Échéance</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : taches.length > 0 ? (
                taches.map(tache => (
                  <TableRow key={tache.id}>
                    <TableCell className="font-medium">{tache.title}</TableCell>
                    <TableCell><Badge variant={getPriorityBadgeVariant(tache.priority)} className="capitalize">{tache.priority}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(tache.status)} className="capitalize">{tache.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>{tache.assignedTo ? staffMap.get(tache.assignedTo) || 'N/A' : 'Non assigné'}</TableCell>
                    <TableCell>{tache.dueDate ? format(new Date(tache.dueDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingTache(tache); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(tache)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucune tâche de maintenance pour le moment.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTache ? 'Modifier la' : 'Nouvelle'} tâche de maintenance</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form id="tache-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Titre de la tâche</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="priority" render={({ field }) => <FormItem><FormLabel>Priorité</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="basse">Basse</SelectItem><SelectItem value="moyenne">Moyenne</SelectItem><SelectItem value="haute">Haute</SelectItem></SelectContent></Select></FormItem>} />
                <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="à_faire">À faire</SelectItem><SelectItem value="en_cours">En cours</SelectItem><SelectItem value="terminée">Terminée</SelectItem></SelectContent></Select></FormItem>} />
              </div>
              <FormField control={form.control} name="assignedTo" render={({ field }) => <FormItem><FormLabel>Assigner à</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir un membre..."/></SelectTrigger></FormControl><SelectContent>{staffMembers.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select></FormItem>} />
              <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="location" render={({ field }) => <FormItem><FormLabel>Emplacement</FormLabel><FormControl><Input placeholder="Ex: Bloc B, Toilettes" {...field} /></FormControl></FormItem>} />
                 <FormField control={form.control} name="dueDate" render={({ field }) => <FormItem><FormLabel>Échéance</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>} />
              </div>
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="tache-form" disabled={form.formState.isSubmitting}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La tâche <strong>{tacheToDelete?.title}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTache} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

