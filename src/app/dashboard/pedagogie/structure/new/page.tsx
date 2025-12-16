
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import type { cycle as Cycle, niveau as Niveau, staff as Staff } from '@/lib/data-types';
import { Skeleton } from '@/components/ui/skeleton';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const classSchema = z.object({
  name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut excéder 50 caractères'),
  
  code: z.string()
    .min(2, 'Le code doit contenir au moins 2 caractères')
    .max(10, 'Le code ne peut excéder 10 caractères')
    .regex(/^[A-Z0-9]+$/, 'Le code doit contenir uniquement des lettres majuscules et chiffres'),
  
  cycleId: z.string().min(1, 'Le cycle est requis.'),
  niveauId: z.string().min(1, 'Le niveau est requis.'),
  
  section: z.string()
    .length(1, 'La section doit être une seule lettre')
    .regex(/^[A-Z]$/, 'La section doit être une lettre majuscule A-Z'),
  
  academicYear: z.string()
    .regex(/^\d{4}-\d{4}$/, 'Format invalide. Utilisez: 2024-2025'),
  
  maxStudents: z.coerce.number()
    .min(1, "L'effectif maximum est requis.")
    .max(100, "L'effectif maximum ne peut excéder 100 élèves"),
  
  mainTeacherId: z.string().optional(),
  classroom: z.string().max(50).optional(),
  building: z.string().max(50).optional(),
  
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

type ClassFormValues = z.infer<typeof classSchema>;

export default function NewClassPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  // --- Data Fetching ---
  const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId, firestore]);
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId, firestore]);
  const teachersQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant')) : null, [schoolId, firestore]);

  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);

  const cycles = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & { id: string })) || [], [cyclesData]);
  const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & { id: string })) || [], [niveauxData]);
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      academicYear: '2024-2025',
      maxStudents: 28,
      status: 'active',
      section: 'A',
      name: '',
      code: '',
      cycleId: '',
      niveauId: '',
      mainTeacherId: '',
      classroom: '',
      building: '',
    },
  });
  
  const watchedCycleId = useWatch({ control: form.control, name: 'cycleId' });
  const watchedNiveauId = useWatch({ control: form.control, name: 'niveauId' });
  const watchedSection = useWatch({ control: form.control, name: 'section' });

  const filteredNiveaux = useMemo(() => niveaux.filter(n => n.cycleId === watchedCycleId), [niveaux, watchedCycleId]);

  useEffect(() => {
    if (watchedCycleId) {
        form.setValue('niveauId', '');
    }
  }, [watchedCycleId, form]);

  useEffect(() => {
      const niveau = niveaux.find(n => n.id === watchedNiveauId);
      if(niveau && watchedSection) {
        const newName = `${niveau.name}-${watchedSection}`;
        const newCode = `${niveau.code}${watchedSection}`;
        form.setValue('name', newName);
        form.setValue('code', newCode);
      } else {
        form.setValue('name', '');
        form.setValue('code', '');
      }
  }, [watchedNiveauId, watchedSection, niveaux, form]);
  
  const checkClassDuplicate = async (code: string, academicYear: string): Promise<boolean> => {
    if (!schoolId) return false;
    const q = query(
        collection(firestore, `ecoles/${schoolId}/classes`),
        where('code', '==', code),
        where('academicYear', '==', academicYear)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };
  
  const handleSubmit = async (values: ClassFormValues) => {
    if (!schoolId || !user) {
        toast({ variant: 'destructive', title: "Erreur d'authentification", description: "Impossible de créer la classe." });
        return;
    }
    
    form.clearErrors();

    try {
      const isDuplicate = await checkClassDuplicate(values.code, values.academicYear);
      if(isDuplicate){
          form.setError('code', { message: 'Une classe avec ce code existe déjà pour cette année scolaire.' });
          return;
      }

      const teacher = teachers.find(t => t.id === values.mainTeacherId);
      const niveau = niveaux.find(n => n.id === values.niveauId);
        
      if (!niveau) {
        toast({ variant: 'destructive', title: "Erreur de données", description: 'Le niveau sélectionné est invalide.' });
        return;
      }

      const classData = {
          ...values,
          schoolId,
          createdBy: user.uid,
          mainTeacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
          teacherIds: values.mainTeacherId ? [values.mainTeacherId] : [],
          grade: niveau.name || '',
          studentCount: 0,
          isFull: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      };
        
      const classesCollectionRef = collection(firestore, `ecoles/${schoolId}/classes`);
      await addDoc(classesCollectionRef, classData)

      toast({
          title: 'Classe créée !',
          description: `La classe ${values.name} a été ajoutée avec succès.`,
      });
      router.push('/dashboard/pedagogie/structure');
    
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
          path: `ecoles/${schoolId}/classes`,
          operation: 'create',
          requestResourceData: values,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({ variant: 'destructive', title: "Échec de la création", description: "Une erreur est survenue. Vérifiez vos permissions et réessayez."})
    }
  };

  const isLoading = schoolLoading || cyclesLoading || niveauxLoading || teachersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10" /><div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64" /></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {[...Array(6)].map((_, i) => (<div key={i} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>))}
        </div>
        <div className="flex justify-end gap-2 pt-6"><Skeleton className="h-10 w-32" /></div>
      </div>
    );
  }
  
  if (cycles.length === 0) {
      return (
           <div className="flex items-center justify-center h-[calc(100vh-200px)]">
              <Card className="max-w-md text-center">
                  <CardHeader>
                      <CardTitle className="flex items-center justify-center gap-2">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                        Action requise
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground">
                        Vous devez d'abord créer au moins un cycle (ex: Primaire, Secondaire) avant de pouvoir créer une classe.
                      </p>
                  </CardContent>
                  <CardFooter>
                      <Button asChild className="w-full">
                          <Link href="/dashboard/pedagogie/structure">Retourner à la gestion de la structure</Link>
                      </Button>
                  </CardFooter>
              </Card>
          </div>
      )
  }

  const { formState: { isSubmitting } } = form;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/dashboard/pedagogie/structure"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div><h1 className="text-2xl font-bold">Créer une nouvelle classe</h1><p className="text-muted-foreground">Configurez une nouvelle classe pour l'année scolaire</p></div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Card>
                <CardHeader><CardTitle>Informations de la classe</CardTitle><CardDescription>Définissez les caractéristiques principales de la classe.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="cycleId" render={({ field }) => (<FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un cycle" /></SelectTrigger></FormControl><SelectContent>{cycles.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="niveauId" render={({ field }) => (<FormItem><FormLabel>Niveau *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedCycleId || filteredNiveaux.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={!watchedCycleId ? "Choisissez un cycle" : "Sélectionnez un niveau"} /></SelectTrigger></FormControl><SelectContent>{filteredNiveaux.map((n) => (<SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="section" render={({ field }) => (<FormItem><FormLabel>Section</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['A', 'B', 'C', 'D', 'E'].map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="academicYear" render={({ field }) => (<FormItem><FormLabel>Année scolaire *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="2024-2025">2024-2025</SelectItem><SelectItem value="2025-2026">2025-2026</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la classe *</FormLabel><FormControl><Input placeholder="Auto-généré" {...field} readOnly /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code *</FormLabel><FormControl><Input placeholder="Auto-généré" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="mainTeacherId" render={({ field }) => (<FormItem><FormLabel>Enseignant principal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un enseignant" /></SelectTrigger></FormControl><SelectContent>{teachers.map((t) => (<SelectItem key={t.id} value={t.id}>{`${t.firstName} ${t.lastName}`}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="classroom" render={({ field }) => (<FormItem><FormLabel>Salle de classe</FormLabel><FormControl><Input placeholder="Ex: Salle 101" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="building" render={({ field }) => (<FormItem><FormLabel>Bâtiment</FormLabel><FormControl><Input placeholder="Ex: Bâtiment A" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="maxStudents" render={({ field }) => (<FormItem><FormLabel>Nombre maximum d'élèves *</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="status" render={({ field }) => (<FormItem className="flex items-center justify-between"><FormLabel>Classe active</FormLabel><FormControl><Switch checked={field.value === 'active'} onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')} /></FormControl></FormItem>)} />

                    </div>
                </CardContent>
            </Card>
            <div className="flex items-center justify-end pt-6"><Button type="submit" disabled={isSubmitting}><Save className="mr-2 h-4 w-4" />Créer la classe</Button></div>
        </form>
      </Form>
    </div>
    </>
  );
}
