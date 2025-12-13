'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { cycle as Cycle } from '@/lib/data-types';

const cycleSchema = z.object({
  name: z.string().min(1, { message: "Le nom du cycle est requis." }),
  code: z.string().min(1, { message: "Le code est requis (ex: MAT, PRI)." }),
  order: z.coerce.number().int().min(1, { message: "L'ordre doit être un nombre positif." }),
  description: z.string().optional(),
});

type CycleFormValues = z.infer<typeof cycleSchema>;

interface CycleWithId extends Cycle {
  id: string;
}

export default function StructurePage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();
  
  const cyclesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`), orderBy("order")) : null, [firestore, schoolId]);
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const cycles: CycleWithId[] = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as CycleWithId)) || [], [cyclesData]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<CycleWithId | null>(null);
  const [cycleToDelete, setCycleToDelete] = useState<CycleWithId | null>(null);

  const form = useForm<CycleFormValues>({
    resolver: zodResolver(cycleSchema),
    defaultValues: { name: "", code: "", order: 1, description: "" },
  });

  useEffect(() => {
    if (isFormOpen) {
      if (editingCycle) {
        form.reset(editingCycle);
      } else {
        form.reset({ name: "", code: "", order: (cycles.length + 1), description: "" });
      }
    }
  }, [isFormOpen, editingCycle, form, cycles]);

  const getCycleDocRef = (cycleId: string) => doc(firestore, `ecoles/${schoolId}/cycles/${cycleId}`);

  const handleCycleSubmit = (values: CycleFormValues) => {
    if (!schoolId) {
      toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
      return;
    }
    
    const cycleData = {
      ...values,
      schoolId,
      updatedAt: serverTimestamp(),
    };

    if (editingCycle) {
        const cycleDocRef = getCycleDocRef(editingCycle.id);
        setDoc(cycleDocRef, cycleData, { merge: true })
        .then(() => {
          toast({ title: "Cycle modifié", description: `Le cycle "${values.name}" a été mis à jour.` });
          setIsFormOpen(false);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: cycleDocRef.path, operation: 'update', requestResourceData: cycleData });
            errorEmitter.emit('permission-error', permissionError);
        });
    } else {
        const cyclesCollectionRef = collection(firestore, `ecoles/${schoolId}/cycles`);
        addDoc(cyclesCollectionRef, { ...cycleData, createdAt: serverTimestamp() })
        .then(() => {
            toast({ title: "Cycle ajouté", description: `Le cycle "${values.name}" a été ajouté.` });
            setIsFormOpen(false);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: cyclesCollectionRef.path, operation: 'create', requestResourceData: cycleData });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  const handleOpenFormDialog = (cycle: CycleWithId | null) => {
    setEditingCycle(cycle);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (cycle: CycleWithId) => {
    setCycleToDelete(cycle);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCycle = () => {
    if (!schoolId || !cycleToDelete) return;
    // TODO: Add logic to check if cycle has children (niveaux) before deleting
    const cycleDocRef = getCycleDocRef(cycleToDelete.id);
    deleteDoc(cycleDocRef)
    .then(() => {
        toast({ title: "Cycle supprimé", description: `Le cycle "${cycleToDelete.name}" a été supprimé.` });
        setIsDeleteDialogOpen(false);
        setCycleToDelete(null);
    })
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: cycleDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  const isLoading = schoolLoading || cyclesLoading;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Structure Pédagogique</h1>
            <p className="text-muted-foreground">Gérez les cycles, les niveaux et les classes de votre établissement.</p>
          </div>
        </div>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Cycles d'Enseignement</CardTitle>
                        <CardDescription>Organisez votre école en grands cycles (Maternelle, Primaire, etc.).</CardDescription>
                    </div>
                     <Button onClick={() => handleOpenFormDialog(null)}>
                        <span className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" /> Ajouter un Cycle
                        </span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ordre</TableHead>
                            <TableHead>Nom du Cycle</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                     <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-8"/></TableCell>
                                <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                                <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                                <TableCell><Skeleton className="h-5 w-48"/></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                            </TableRow>
                            ))
                        ) : cycles.length > 0 ? (
                            cycles.map(cycle => (
                                <TableRow key={cycle.id}>
                                    <TableCell>{cycle.order}</TableCell>
                                    <TableCell className="font-medium">{cycle.name}</TableCell>
                                    <TableCell className="font-mono text-xs">{cycle.code}</TableCell>
                                    <TableCell className="text-muted-foreground">{cycle.description}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenFormDialog(cycle)}>Modifier</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(cycle)}>Supprimer</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Aucun cycle créé. Commencez par en ajouter un.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCycle ? "Modifier le" : "Ajouter un"} Cycle</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form id="cycle-form" onSubmit={form.handleSubmit(handleCycleSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du Cycle</FormLabel><FormControl><Input placeholder="Ex: Enseignement Primaire" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="Ex: PRI" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (optionnel)</FormLabel><FormControl><Textarea placeholder="Courte description du cycle..." {...field} /></FormControl></FormItem>)} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="cycle-form" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. La suppression d'un cycle entraînera la suppression de tous les niveaux et classes associés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCycle} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
