
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
import type { salle as Salle } from '@/lib/data-types';

const salleSchema = z.object({
  name: z.string().min(1, "Le nom de la salle est requis."),
  type: z.enum(["salle_de_classe", "salle_de_reunion", "laboratoire", "amphitheatre", "gymnase"]),
  capacity: z.coerce.number().min(1, "La capacité est requise."),
  buildingId: z.string().optional(),
  equipments: z.string().optional(),
});

type SalleFormValues = z.infer<typeof salleSchema>;

export default function ReservationsPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageContent;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSalle, setEditingSalle] = useState<(Salle & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [salleToDelete, setSalleToDelete] = useState<(Salle & { id: string }) | null>(null);

  const sallesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/salles`)) : null, [firestore, schoolId]);
  const { data: sallesData, loading: sallesLoading } = useCollection(sallesQuery);
  const salles: (Salle & { id: string })[] = useMemo(() => sallesData?.map(d => ({ id: d.id, ...d.data() } as Salle & { id: string })) || [], [sallesData]);

  const form = useForm<SalleFormValues>({
    resolver: zodResolver(salleSchema),
    defaultValues: { type: "salle_de_classe", capacity: 30 },
  });

  useEffect(() => {
    form.reset(
      editingSalle 
        ? { ...editingSalle, equipments: (editingSalle.equipments || []).join(', ') } 
        : { type: 'salle_de_classe', capacity: 30, name: '', buildingId: '', equipments: '' }
    );
  }, [isFormOpen, editingSalle, form]);

  const handleFormSubmit = async (values: SalleFormValues) => {
    if (!schoolId) return;
    
    const dataToSave = {
        ...values,
        equipments: values.equipments ? values.equipments.split(',').map(e => e.trim()) : [],
    };

    const promise = editingSalle
      ? setDoc(doc(firestore, `ecoles/${schoolId}/salles/${editingSalle.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/salles`), dataToSave);

    try {
      await promise;
      toast({ title: `Salle ${editingSalle ? 'modifiée' : 'ajoutée'}`, description: `La salle ${values.name} a été enregistrée.` });
      setIsFormOpen(false);
    } catch (error) {
      const path = `ecoles/${schoolId}/salles/${editingSalle?.id || '(new)'}`;
      const operation = editingSalle ? 'update' : 'create';
      const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleOpenDeleteDialog = (salle: Salle & { id: string }) => {
    setSalleToDelete(salle);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteSalle = async () => {
    if (!schoolId || !salleToDelete) return;
    try {
      await deleteDoc(doc(firestore, `ecoles/${schoolId}/salles`, salleToDelete.id));
      toast({ title: "Salle supprimée", description: `La salle ${salleToDelete.name} a été supprimée.` });
    } catch (error) {
       const permissionError = new FirestorePermissionError({ path: `ecoles/${schoolId}/salles/${salleToDelete.id}`, operation: 'delete' });
       errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsDeleteDialogOpen(false);
        setSalleToDelete(null);
    }
  };

  const isLoading = schoolLoading || sallesLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion des Salles</CardTitle>
              <CardDescription>Gérez les salles et locaux de votre établissement.</CardDescription>
            </div>
            {canManageContent && (
              <Button onClick={() => { setEditingSalle(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter une salle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead>Capacité</TableHead><TableHead>Bâtiment</TableHead><TableHead>Équipements</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : salles.length > 0 ? (
                salles.map(salle => (
                  <TableRow key={salle.id}>
                    <TableCell className="font-medium">{salle.name}</TableCell>
                    <TableCell className="capitalize">{salle.type?.replace(/_/g, ' ') || 'N/A'}</TableCell>
                    <TableCell>{salle.capacity}</TableCell>
                    <TableCell>{salle.buildingId || 'N/A'}</TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {salle.equipments?.map(eq => <Badge key={eq} variant="outline" className="text-xs">{eq}</Badge>)}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingSalle(salle); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(salle)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucune salle enregistrée.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSalle ? 'Modifier la salle' : 'Ajouter une salle'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form id="salle-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Ex: Salle de réunion 1" {...field} /></FormControl><FormMessage /></FormItem>} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="capacity" render={({ field }) => <FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value="salle_de_classe">Salle de classe</SelectItem>
                    <SelectItem value="salle_de_reunion">Salle de réunion</SelectItem>
                    <SelectItem value="laboratoire">Laboratoire</SelectItem>
                    <SelectItem value="amphitheatre">Amphithéâtre</SelectItem>
                    <SelectItem value="gymnase">Gymnase</SelectItem>
                </SelectContent></Select></FormItem>} />
              </div>
              <FormField control={form.control} name="buildingId" render={({ field }) => <FormItem><FormLabel>Bâtiment (optionnel)</FormLabel><FormControl><Input placeholder="Ex: Bâtiment A" {...field} /></FormControl><FormMessage /></FormItem>} />
               <FormField control={form.control} name="equipments" render={({ field }) => <FormItem><FormLabel>Équipements (séparés par une virgule)</FormLabel><FormControl><Input placeholder="Ex: Projecteur, Tableau blanc" {...field} /></FormControl><FormMessage /></FormItem>} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="salle-form" disabled={form.formState.isSubmitting}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette salle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La salle <strong>{salleToDelete?.name}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSalle} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

