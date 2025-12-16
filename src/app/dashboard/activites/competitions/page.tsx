
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Trophy } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, addDoc, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { competition as Competition } from '@/lib/data-types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
  const canManageContent = !!user?.profile?.permissions?.manageContent;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<(Competition & { id: string }) | null>(null);

  const competitionsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/competitions`)) : null, [firestore, schoolId]);
  const { data: competitionsData, loading: competitionsLoading } = useCollection(competitionsQuery);
  const competitions = useMemo(() => competitionsData?.map(d => ({ id: d.id, ...d.data() } as Competition & { id: string })) || [], [competitionsData]);

  const form = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionSchema),
  });

  const handleOpenForm = (competition: (Competition & { id: string }) | null) => {
    setEditingCompetition(competition);
    form.reset(competition ? {
        ...competition,
        date: format(new Date(competition.date), 'yyyy-MM-dd')
    } : { name: '', date: format(new Date(), 'yyyy-MM-dd'), description: '', results: '' });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: CompetitionFormValues) => {
    if (!schoolId) return;

    const promise = editingCompetition
      ? setDoc(doc(firestore, `ecoles/${schoolId}/competitions/${editingCompetition.id}`), values, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/competitions`), values);

    try {
      await promise;
      toast({ title: `Compétition ${editingCompetition ? 'modifiée' : 'ajoutée'}`, description: `L'événement ${values.name} a été enregistré.` });
      setIsFormOpen(false);
    } catch (error) {
      const path = `ecoles/${schoolId}/competitions/${editingCompetition?.id || '(new)'}`;
      const operation = editingCompetition ? 'update' : 'create';
      const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: values });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const isLoading = schoolLoading || competitionsLoading;

  return (
    <>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Compétitions et Événements</CardTitle>
                <CardDescription>Gérez les événements sportifs et culturels.</CardDescription>
              </div>
              {canManageContent && (
                <Button onClick={() => handleOpenForm(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nouvel Événement
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Date</TableHead><TableHead>Résultats</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                ) : competitions.length > 0 ? (
                  competitions.map(comp => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{format(new Date(comp.date), 'd MMMM yyyy', { locale: fr })}</TableCell>
                      <TableCell className="text-muted-foreground">{comp.results || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenForm(comp)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center">Aucune compétition enregistrée.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompetition ? 'Modifier' : 'Ajouter'} un événement</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form id="competition-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom de l'événement</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="date" render={({ field }) => <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
              <FormField control={form.control} name="results" render={({ field }) => <FormItem><FormLabel>Résultats</FormLabel><FormControl><Input placeholder="Ex: 1ère place, Gagnant..." {...field} /></FormControl></FormItem>} />
            </form>
          </Form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
            <Button type="submit" form="competition-form" disabled={form.formState.isSubmitting}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
