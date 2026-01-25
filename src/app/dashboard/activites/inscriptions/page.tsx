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
import { PlusCircle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { activite as Activite, student as Student, inscriptionActivite as Inscription } from '@/lib/data-types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const inscriptionSchema = z.object({
  studentId: z.string().min(1, { message: "Veuillez sélectionner un élève." }),
  activiteId: z.string().min(1, { message: "Veuillez sélectionner une activité." }),
  academicYear: z.string().min(1, { message: "L'année académique est requise." }),
});
type InscriptionFormValues = z.infer<typeof inscriptionSchema>;

export default function InscriptionsPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageActivities = !!user?.profile?.permissions?.manageActivities;

  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const inscriptionsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/inscriptions_activites`)) : null, [firestore, schoolId]);
  const { data: inscriptionsData, loading: inscriptionsLoading } = useCollection(inscriptionsQuery);
  const activitesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/activites`)) : null, [firestore, schoolId]);
  const { data: activitesData, loading: activitesLoading } = useCollection(activitesQuery);
  const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

  const activites: (Activite & { id: string })[] = useMemo(() => activitesData?.map(d => ({ id: d.id, ...d.data() } as Activite & { id: string })) || [], [activitesData]);
  const students: (Student & { id: string })[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student & { id: string })) || [], [studentsData]);
  const inscriptions = useMemo(() => {
    if (!inscriptionsData) return [];
    const studentMap = new Map(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]));
    const activiteMap = new Map(activites.map(a => [a.id, a.name]));
    return inscriptionsData.map(doc => {
      const data = doc.data() as Inscription;
      return { id: doc.id, ...data, studentName: studentMap.get(data.studentId) || 'N/A', activiteName: activiteMap.get(data.activiteId) || 'N/A' };
    });
  }, [inscriptionsData, students, activites]);
  
  const form = useForm<InscriptionFormValues>({ resolver: zodResolver(inscriptionSchema), defaultValues: { academicYear: '2024-2025' } });

  const handleFormSubmit = async (values: InscriptionFormValues) => {
    if (!schoolId) return;
    const collectionRef = collection(firestore, `ecoles/${schoolId}/inscriptions_activites`);
    try {
      await addDoc(collectionRef, values);
      toast({ title: 'Inscription réussie' });
      setIsFormOpen(false);
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collectionRef.path, operation: 'create', requestResourceData: values }));
    }
  };

  const handleDelete = async (inscriptionId: string) => {
    if (!schoolId) return;
    const docRef = doc(firestore, `ecoles/${schoolId}/inscriptions_activites`, inscriptionId);
    try {
      await deleteDoc(docRef);
      toast({ title: "Inscription annulée" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
    }
  }

  const isLoading = schoolLoading || inscriptionsLoading || activitesLoading || studentsLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div><CardTitle>Inscriptions aux Activités</CardTitle><CardDescription>Gérez les élèves inscrits aux activités.</CardDescription></div>
            {canManageActivities && (<Button onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Inscrire un élève</Button>)}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Élève</TableHead><TableHead>Activité</TableHead><TableHead>Année</TableHead>{canManageActivities && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {isLoading ? ([...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>))
              : inscriptions.length > 0 ? (inscriptions.map(inscription => (
                  <TableRow key={inscription.id}>
                    <TableCell className="font-medium">{inscription.studentName}</TableCell>
                    <TableCell>{inscription.activiteName}</TableCell>
                    <TableCell>{inscription.academicYear}</TableCell>
                    <TableCell className="text-right">{canManageActivities && <Button variant="ghost" size="icon" onClick={() => handleDelete(inscription.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</TableCell>
                  </TableRow>
                )))
              : (<TableRow><TableCell colSpan={4} className="h-24 text-center">Aucune inscription.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inscrire un élève</DialogTitle></DialogHeader>
          <Form {...form}><form id="inscription-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="studentId" render={({ field }) => <FormItem><FormLabel>Élève</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger></FormControl><SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="activiteId" render={({ field }) => <FormItem><FormLabel>Activité</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger></FormControl><SelectContent>{activites.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="academicYear" render={({ field }) => (<FormItem><FormLabel>Année Scolaire</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="2024-2025">2024-2025</SelectItem><SelectItem value="2025-2026">2025-2026</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          </form></Form>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button><Button type="submit" form="inscription-form" disabled={form.formState.isSubmitting}>Inscrire</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}