'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, addDoc, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { competition as Competition } from '@/lib/data-types';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const competitionSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  date: z.string().min(1, "La date est requise."),
  description: z.string().optional(),
  results: z.string().optional(),
});
type CompetitionFormValues = z.infer<typeof competitionSchema>;

export default function CompetitionsPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageActivities = !!user?.profile?.permissions?.manageActivities;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<(Competition & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [competitionToDelete, setCompetitionToDelete] = useState<(Competition & { id: string }) | null>(null);

  const competitionsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/competitions`)) : null, [firestore, schoolId]);
  const { data: competitionsData, loading: competitionsLoading } = useCollection(competitionsQuery);
  const competitions = useMemo(() => competitionsData?.map(d => ({ id: d.id, ...d.data() } as Competition & { id: string })) || [], [competitionsData]);

  const form = useForm<CompetitionFormValues>({ resolver: zodResolver(competitionSchema) });

  const handleOpenForm = (competition: (Competition & { id: string }) | null) => {
    setEditingCompetition(competition);
    form.reset(competition ? { ...competition, date: format(new Date(competition.date), 'yyyy-MM-dd') } : { name: '', date: format(new Date(), 'yyyy-MM-dd'), description: '', results: '' });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: CompetitionFormValues) => {
    if (!schoolId) return;
    const collectionRef = collection(firestore, `ecoles/${schoolId}/competitions`);
    const promise = editingCompetition
      ? setDoc(doc(collectionRef, editingCompetition.id), values, { merge: true })
      : addDoc(collectionRef, values);
    try {
      await promise;
      toast({ title: `Compétition ${editingCompetition ? 'modifiée' : 'ajoutée'}` });
      setIsFormOpen(false);
    } catch (e) {
      console.error("Error saving competition:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer la compétition.' });
    }
  };
  
  const handleOpenDeleteDialog = (competition: Competition & { id: string }) => {
    setCompetitionToDelete(competition);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCompetition = async () => {
    if (!schoolId || !competitionToDelete) return;
    const docRef = doc(firestore, `ecoles/${schoolId}/competitions`, competitionToDelete.id);
    try {
      await deleteDoc(docRef);
      toast({ title: 'Événement supprimé' });
    } catch (e) {
       console.error("Error deleting competition:", e);
       toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer la compétition.' });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const isLoading = schoolLoading || competitionsLoading;

  return (
    <>
      <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div><CardTitle>Compétitions et Événements</CardTitle><CardDescription>Gérez les événements sportifs et culturels.</CardDescription></div>
              {canManageActivities && (<Button onClick={() => handleOpenForm(null)}><PlusCircle className="mr-2 h-4 w-4" />Nouvel Événement</Button>)}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Date</TableHead><TableHead>Résultats</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? ([...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>))
                : competitions.length > 0 ? (competitions.map(comp => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{format(new Date(comp.date), 'd MMMM yyyy', { locale: fr })}</TableCell>
                      <TableCell className="text-muted-foreground">{comp.results || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/activites/competitions/${comp.id}`}>
                                <Users className="mr-2 h-4 w-4"/>Gérer participants
                              </Link>
                            </DropdownMenuItem>
                            {canManageActivities && <DropdownMenuItem onClick={() => handleOpenForm(comp)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>}
                            {canManageActivities && <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(comp)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )))
                : (<TableRow><TableCell colSpan={4} className="h-24 text-center">Aucune compétition.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCompetition ? 'Modifier' : 'Ajouter'} un événement</DialogTitle></DialogHeader>
          <Form {...form}><form id="competition-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="date" render={({ field }) => <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
              <FormField control={form.control} name="results" render={({ field }) => <FormItem><FormLabel>Résultats</FormLabel><FormControl><Input placeholder="Ex: 1ère place..." {...field} /></FormControl></FormItem>} />
          </form></Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="competition-form" disabled={form.formState.isSubmitting}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. L'événement <strong>"{competitionToDelete?.name}"</strong> sera définitivement supprimé.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCompetition} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
