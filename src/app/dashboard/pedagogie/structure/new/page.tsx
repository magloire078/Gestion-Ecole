
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import type { cycle, niveau, staff } from '@/lib/data-types';

const newClassSchema = z.object({
  cycleId: z.string().min(1, "Le cycle est requis."),
  niveauId: z.string().min(1, "Le niveau est requis."),
  section: z.string().min(1, "La section (ex: A, B) est requise.").max(5),
  mainTeacherId: z.string().optional(),
  maxStudents: z.coerce.number().int().min(1, "L'effectif maximum est requis."),
  classroom: z.string().optional(),
});

type NewClassFormValues = z.infer<typeof newClassSchema>;

export default function NewClassPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  const cyclesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/cycles`) : null, [schoolId]);
  const niveauxQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/niveaux`) : null, [schoolId]);
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/personnel`) : null, [schoolId]);

  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);

  const cycles = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as cycle & { id: string })) || [], [cyclesData]);
  const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as niveau & { id: string })) || [], [niveauxData]);
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as staff & { id: string })) || [], [teachersData]);

  const form = useForm<NewClassFormValues>({
    resolver: zodResolver(newClassSchema),
    defaultValues: { maxStudents: 30 },
  });

  const watchedCycleId = form.watch('cycleId');
  const filteredNiveaux = useMemo(() => niveaux.filter(n => n.cycleId === watchedCycleId), [niveaux, watchedCycleId]);

  const onSubmit = async (values: NewClassFormValues) => {
    if (!schoolId || !user) {
        toast({ title: "Erreur", description: "Utilisateur ou école non identifié.", variant: "destructive" });
        return;
    }

    const niveau = niveaux.find(n => n.id === values.niveauId);
    if (!niveau) {
        toast({ title: "Erreur", description: "Niveau sélectionné invalide.", variant: "destructive" });
        return;
    }
    const teacher = teachers.find(t => t.id === values.mainTeacherId);

    const className = `${niveau.code}-${values.section.toUpperCase()}`;
    const classCode = `${niveau.code}${values.section.toUpperCase()}`;
    const academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const newClassData = {
        schoolId,
        cycleId: values.cycleId,
        niveauId: values.niveauId,
        name: className,
        code: classCode,
        section: values.section.toUpperCase(),
        academicYear,
        studentCount: 0,
        maxStudents: values.maxStudents,
        mainTeacherId: values.mainTeacherId || '',
        mainTeacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
        classroom: values.classroom || '',
        status: 'active',
        isFull: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
    };
    
    try {
        const classesCollectionRef = collection(firestore, `ecoles/${schoolId}/classes`);
        await addDoc(classesCollectionRef, newClassData);
        toast({ title: "Classe créée !", description: `La classe ${className} a été créée avec succès.` });
        router.push('/dashboard/pedagogie/structure');
    } catch(e) {
        console.error(e);
        toast({ title: "Erreur de création", description: "Impossible de créer la classe.", variant: "destructive" });
    }
  };
  
  const isLoading = schoolLoading || cyclesLoading || niveauxLoading || teachersLoading;

  return (
    <div className="space-y-6">
       <Button variant="outline" onClick={() => router.back()} className="w-fit">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à la structure
      </Button>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Créer une Nouvelle Classe</CardTitle>
          <CardDescription>
            Remplissez les informations ci-dessous pour ajouter une nouvelle classe.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="cycleId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cycle</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un cycle..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="niveauId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Niveau</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchedCycleId || isLoading}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un niveau..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {filteredNiveaux.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="section"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Section</FormLabel>
                                <FormControl><Input placeholder="Ex: A, B, C..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="mainTeacherId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Enseignant Principal (Optionnel)</FormLabel>
                                 <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un enseignant..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{`${t.firstName} ${t.lastName}`}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="maxStudents"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Effectif Max.</FormLabel>
                                    <FormControl><Input type="number" placeholder="30" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="classroom"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Salle (Optionnel)</FormLabel>
                                    <FormControl><Input placeholder="Ex: Salle 101" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                     </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                        {form.formState.isSubmitting ? "Création en cours..." : "Créer la classe"}
                    </Button>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}
