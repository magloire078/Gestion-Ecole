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
import { collection, query, addDoc, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { materiel as Materiel, salle as Salle } from '@/lib/data-types';
import { format } from 'date-fns';

const materielSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  category: z.enum(["Mobilier", "Informatique", "Pédagogique", "Sportif", "Autre"]),
  quantity: z.coerce.number().min(1, "La quantité doit être au moins de 1."),
  status: z.enum(["neuf", "bon", "à réparer", "hors_service"]),
  locationId: z.string().min(1, "L'emplacement est requis."),
  acquisitionDate: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
});

type MaterielFormValues = z.infer<typeof materielSchema>;

export default function InventairePage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageInventory;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMateriel, setEditingMateriel] = useState<(Materiel & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [materielToDelete, setMaterielToDelete] = useState<(Materiel & { id: string }) | null>(null);

  const inventaireQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/inventaire`)) : null, [firestore, schoolId]);
  const { data: inventaireData, loading: inventaireLoading } = useCollection(inventaireQuery);
  const inventaire: (Materiel & { id: string })[] = useMemo(() => inventaireData?.map(d => ({ id: d.id, ...d.data() } as Materiel & { id: string })) || [], [inventaireData]);

  const sallesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/salles`)) : null, [firestore, schoolId]);
  const { data: sallesData, loading: sallesLoading } = useCollection(sallesQuery);
  const salles = useMemo(() => sallesData?.map(doc => ({ id: doc.id, ...doc.data() } as Salle & {id: string})) || [], [sallesData]);
  const salleMap = useMemo(() => new Map(salles.map(s => [s.id, s.name])), [salles]);

  const form = useForm<MaterielFormValues>({
    resolver: zodResolver(materielSchema),
    defaultValues: { category: "Mobilier", status: "bon", quantity: 1 },
  });

  useEffect(() => {
    form.reset(
      editingMateriel 
        ? { ...editingMateriel, acquisitionDate: editingMateriel.acquisitionDate ? format(new Date(editingMateriel.acquisitionDate), 'yyyy-MM-dd') : '' }
        : { category: "Mobilier", status: "bon", quantity: 1, locationId: '', name: '', acquisitionDate: format(new Date(), 'yyyy-MM-dd') }
    );
  }, [isFormOpen, editingMateriel, form]);

  const handleFormSubmit = async (values: MaterielFormValues) => {
    if (!schoolId) return;

    const dataToSave = { ...values, schoolId };

    const promise = editingMateriel
        ? setDoc(doc(firestore, `ecoles/${schoolId}/inventaire`, editingMateriel.id), dataToSave, { merge: true })
        : addDoc(collection(firestore, `ecoles/${schoolId}/inventaire`), dataToSave);
    try {
        await promise;
        toast({ title: `Matériel ${editingMateriel ? 'modifié' : 'ajouté'}`, description: `L'équipement ${values.name} a été enregistré.` });
        setIsFormOpen(false);
    } catch (e) {
        const path = `ecoles/${schoolId}/inventaire/${editingMateriel?.id || '(new)'}`;
        const operation = editingMateriel ? 'update' : 'create';
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleOpenDeleteDialog = (materiel: Materiel & { id: string }) => {
    setMaterielToDelete(materiel);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteMateriel = async () => {
    if (!schoolId || !materielToDelete) return;
    try {
      const docRef = doc(firestore, `ecoles/${schoolId}/inventaire`, materielToDelete.id);
      await deleteDoc(docRef);
      toast({ title: "Équipement supprimé", description: `L'équipement ${materielToDelete.name} a été retiré de l'inventaire.` });
    } catch (e) {
      const permissionError = new FirestorePermissionError({ path: `ecoles/${schoolId}/inventaire/${materielToDelete.id}`, operation: 'delete' });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleteDialogOpen(false);
        setMaterielToDelete(null);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch(status) {
        case 'neuf': return 'default';
        case 'bon': return 'secondary';
        case 'à réparer': return 'outline';
        case 'hors_service': return 'destructive';
        default: return 'default';
    }
  };
  
  const isLoading = schoolLoading || inventaireLoading || sallesLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Inventaire du Matériel</CardTitle>
              <CardDescription>Gérez le matériel et les équipements de votre établissement.</CardDescription>
            </div>
            {canManageContent && (
              <Button onClick={() => { setEditingMateriel(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter du matériel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Catégorie</TableHead><TableHead>Quantité</TableHead><TableHead>Emplacement</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : inventaire.length > 0 ? (
                inventaire.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{salleMap.get(item.locationId) || item.locationId}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge></TableCell>
                    <TableCell className="text-right">
                       {canManageContent && (
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditingMateriel(item); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(item)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun matériel enregistré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMateriel ? 'Modifier' : 'Ajouter'} un équipement</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form id="materiel-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom de l'équipement</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="category" render={({ field }) => <FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Mobilier">Mobilier</SelectItem><SelectItem value="Informatique">Informatique</SelectItem><SelectItem value="Pédagogique">Pédagogique</SelectItem><SelectItem value="Sportif">Sportif</SelectItem><SelectItem value="Autre">Autre</SelectItem></SelectContent></Select></FormItem>} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => <FormItem><FormLabel>Quantité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="neuf">Neuf</SelectItem><SelectItem value="bon">Bon</SelectItem><SelectItem value="à réparer">À réparer</SelectItem><SelectItem value="hors_service">Hors service</SelectItem></SelectContent></Select></FormItem>} />
              </div>
              <FormField control={form.control} name="locationId" render={({ field }) => <FormItem><FormLabel>Emplacement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir une salle..."/></SelectTrigger></FormControl><SelectContent>{salles.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="acquisitionDate" render={({ field }) => <FormItem><FormLabel>Date d'acquisition</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="materiel-form" disabled={form.formState.isSubmitting}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet équipement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'équipement <strong>{materielToDelete?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMateriel} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
