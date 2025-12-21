

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { staff as Staff, cycle as Cycle, niveau as Niveau } from '@/lib/data-types';
import { Skeleton } from '@/components/ui/skeleton';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const classSchema = z.object({
  cycleId: z.string().min(1, 'Le cycle est requis.'),
  niveauId: z.string().min(1, 'Le niveau est requis.'),
  section: z.string().min(1, 'La section/lettre est requise (ex: A, B, C...).').max(5, 'La section est trop longue.'),
  academicYear: z.string().min(1, 'L\'année académique est requise.'),
  mainTeacherId: z.string().optional(),
  maxStudents: z.coerce.number().min(1, 'La capacité doit être d\'au moins 1.'),
  classroom: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

function NewClassPageSkeleton() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32 ml-auto" />
                </CardFooter>
            </Card>
        </div>
    )
}

export default function NewClassPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { schoolId, loading: schoolDataLoading } = useSchoolData();
  const { user, loading: userLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Data Fetching ---
  const cyclesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/cycles`) : null, [firestore, schoolId]);
  const niveauxQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/niveaux`) : null, [firestore, schoolId]);
  const teachersQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/personnel`) : null, [firestore, schoolId]);
  
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);

  const cycles = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & { id: string })) || [], [cyclesData]);
  const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & { id: string })) || [], [niveauxData]);
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: { 
      academicYear: academicYear, 
      maxStudents: 30,
      cycleId: '',
      niveauId: '',
      section: '',
      mainTeacherId: '',
      classroom: '',
    },
  });
  
  const watchedCycleId = useWatch({ control: form.control, name: 'cycleId' });
  const filteredNiveaux = useMemo(() => niveaux.filter(n => n.cycleId === watchedCycleId), [niveaux, watchedCycleId]);

  useEffect(() => {
    form.setValue('niveauId', '');
  }, [watchedCycleId, form]);


  const onSubmit = async (values: ClassFormValues) => {
    if (!schoolId || !user?.uid) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de créer la classe.' });
        return;
    }
    
    setIsSubmitting(true);
    
    const selectedNiveau = niveaux.find(n => n.id === values.niveauId);
    const selectedTeacher = teachers.find(t => t.id === values.mainTeacherId);
    const className = `${selectedNiveau?.name}-${values.section.toUpperCase()}`;
    const classCode = `${selectedNiveau?.code}${values.section.toUpperCase()}`;

    const newClassData = {
        ...values,
        schoolId,
        name: className,
        code: classCode,
        grade: selectedNiveau?.name || 'N/A',
        mainTeacherName: selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : '',
        studentCount: 0,
        status: 'active' as const,
        isFull: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
    };

    try {
        await addDoc(collection(firestore, `ecoles/${schoolId}/classes`), newClassData);
        toast({ title: 'Classe créée', description: `La classe ${className} a été ajoutée.` });
        router.push('/dashboard/pedagogie/structure');
    } catch (e) {
         const permissionError = new FirestorePermissionError({
            path: `ecoles/${schoolId}/classes`,
            operation: 'create',
            requestResourceData: newClassData,
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = schoolDataLoading || userLoading || cyclesLoading || niveauxLoading || teachersLoading;

  if (isLoading) {
      return <NewClassPageSkeleton />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
       <div>
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Retour
            </Button>
            <h1 className="text-2xl font-bold">Créer une Nouvelle Classe</h1>
            <p className="text-muted-foreground">Renseignez les informations de la nouvelle classe pour l'année en cours.</p>
        </div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                 <Card>
                    <CardContent className="pt-6 space-y-6">
                        <FormField
                            control={form.control}
                            name="cycleId"
                            render={({ field }) => (
                                <FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir un cycle..." /></SelectTrigger></FormControl><SelectContent>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="niveauId"
                            render={({ field }) => (
                                <FormItem><FormLabel>Niveau *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedCycleId}><FormControl><SelectTrigger><SelectValue placeholder={watchedCycleId ? "Choisir un niveau..." : "Sélectionnez d'abord un cycle"} /></SelectTrigger></FormControl><SelectContent>{filteredNiveaux.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )}
                        />
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="section" render={({ field }) => (<FormItem><FormLabel>Section *</FormLabel><FormControl><Input placeholder="Ex: A" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="academicYear" render={({ field }) => (<FormItem><FormLabel>Année Scolaire *</FormLabel><FormControl><Input {...field} readOnly className="bg-muted"/></FormControl><FormMessage /></FormItem>)} />
                         </div>
                        <FormField
                            control={form.control}
                            name="mainTeacherId"
                            render={({ field }) => (
                                <FormItem><FormLabel>Enseignant Principal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="(Optionnel)" /></SelectTrigger></FormControl><SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent></Select></FormItem>
                            )}
                        />
                         <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="maxStudents" render={({ field }) => (<FormItem><FormLabel>Capacité Max. *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="classroom" render={({ field }) => (<FormItem><FormLabel>Salle de classe</FormLabel><FormControl><Input placeholder="Ex: Salle 101" {...field} /></FormControl></FormItem>)} />
                         </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                         <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Créer la classe
                        </Button>
                    </CardFooter>
                 </Card>
            </form>
        </Form>
    </div>
  )
}
