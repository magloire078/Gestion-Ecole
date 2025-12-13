
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import type { cycle as Cycle, niveau as Niveau, staff as Staff } from '@/lib/data-types';
import { Skeleton } from '@/components/ui/skeleton';
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
    .regex(/^[A-Z]$/, 'La section doit être une lettre majuscule A-Z')
    .optional(),
  
  academicYear: z.string()
    .regex(/^\d{4}-\d{4}$/, 'Format invalide. Utilisez: 2024-2025'),
  
  maxStudents: z.coerce.number()
    .min(1, "L'effectif maximum est requis.")
    .max(40, "L'effectif maximum ne peut excéder 40 élèves"),
  
  mainTeacherId: z.string().optional(),
  classroom: z.string().max(50).optional(),
  building: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

type ClassFormValues = z.infer<typeof classSchema>;

export default function NewClassPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();

  // --- Component State ---
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formValues, setFormValues] = useState<ClassFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Data Fetching ---
  const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId]);
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId]);
  const teachersQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant')) : null, [schoolId]);

  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const { data: teachersData, loading: teachersLoading } = useCollection(teachersQuery);

  const cycles = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & { id: string })) || [], [cyclesData]);
  const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & { id: string })) || [], [niveauxData]);
  const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);

  // Schéma de validation dynamique qui dépend des niveaux chargés
  const classSchemaWithRefine = useMemo(() => classSchema.refine(
    (data) => {
      if (!niveaux || niveaux.length === 0) return true; // Ne pas valider si les niveaux ne sont pas chargés
      const niveau = niveaux.find(n => n.id === data.niveauId);
      return niveau ? niveau.cycleId === data.cycleId : true;
    },
    {
      message: "Le niveau sélectionné n'appartient pas au cycle choisi",
      path: ["niveauId"]
    }
  ), [niveaux]);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchemaWithRefine),
    defaultValues: {
      academicYear: '2024-2025',
      maxStudents: 28,
      status: 'active',
      section: 'A',
      name: '',
      code: '',
      cycleId: '',
      niveauId: '',
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

  const handleSubmit = async (values: ClassFormValues) => {
    setFormValues(values);
    setShowConfirmDialog(true);
  };
  
  const handleConfirmCreate = async () => {
    if (!formValues || !schoolId || !user) {
        setShowConfirmDialog(false);
        return;
    }
    
    setIsSubmitting(true);

    try {
        const teacher = teachers.find(t => t.id === formValues.mainTeacherId);
        const niveau = niveaux.find(n => n.id === formValues.niveauId);
        
        const classData = {
          ...formValues,
          schoolId,
          createdBy: user.uid,
          mainTeacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '',
          teacherIds: formValues.mainTeacherId ? [formValues.mainTeacherId] : [],
          grade: niveau?.name || '',
        };
        
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(classData),
        });
    
        const responseData = await response.json();
    
        if (!response.ok) {
            throw new Error(responseData.error || 'Une erreur est survenue.');
        }

        toast({
            title: 'Classe créée !',
            description: `La classe ${formValues.name} a été ajoutée avec succès.`,
        });
        router.push('/dashboard/pedagogie/structure');
    
    } catch (error: any) {
        if (error.message.includes('code existe déjà')) {
            form.setError('code', { message: error.message });
        } else {
            console.error("Erreur lors de la création de la classe:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: error.message });
        }
    } finally {
        setIsSubmitting(false);
        setShowConfirmDialog(false);
        setFormValues(null);
    }
  };

  const isLoading = schoolLoading || cyclesLoading || niveauxLoading || teachersLoading;

  if (isLoading) {
      return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-48" />
             <Tabs defaultValue="informations" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="informations">Informations</TabsTrigger>
                    <TabsTrigger value="effectif">Effectif</TabsTrigger>
                    <TabsTrigger value="options">Options</TabsTrigger>
                </TabsList>
                 <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-2/3 mt-2" /></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    </CardContent>
                </Card>
             </Tabs>
        </div>
      );
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/pedagogie/structure">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Créer une nouvelle classe</h1>
          <p className="text-muted-foreground">Configurez une nouvelle classe pour l'année scolaire</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs defaultValue="informations" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="informations">Informations</TabsTrigger>
                    <TabsTrigger value="effectif">Effectif</TabsTrigger>
                    <TabsTrigger value="options">Options</TabsTrigger>
                </TabsList>

                <TabsContent value="informations">
                    <Card>
                        <CardHeader><CardTitle>Informations de la classe</CardTitle><CardDescription>Définissez les caractéristiques principales de la classe.</CardDescription></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="cycleId" render={({ field }) => (<FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un cycle" /></SelectTrigger></FormControl><SelectContent>{cycles.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="niveauId" render={({ field }) => (<FormItem><FormLabel>Niveau *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedCycleId || filteredNiveaux.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={!watchedCycleId ? "Choisissez un cycle" : "Sélectionnez un niveau"} /></SelectTrigger></FormControl><SelectContent>{filteredNiveaux.map((n) => (<SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="section" render={({ field }) => (<FormItem><FormLabel>Section</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['A', 'B', 'C', 'D', 'E'].map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="academicYear" render={({ field }) => (<FormItem><FormLabel>Année scolaire *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="2024-2025">2024-2025</SelectItem><SelectItem value="2025-2026">2025-2026</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la classe *</FormLabel><FormControl><Input placeholder="Auto-généré" {...field} readOnly /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code *</FormLabel><FormControl><Input placeholder="Auto-généré" {...field} readOnly /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="mainTeacherId" render={({ field }) => (<FormItem><FormLabel>Enseignant principal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un enseignant" /></SelectTrigger></FormControl><SelectContent>{teachers.map((t) => (<SelectItem key={t.id} value={t.id}>{`${t.firstName} ${t.lastName}`}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="classroom" render={({ field }) => (<FormItem><FormLabel>Salle de classe</FormLabel><FormControl><Input placeholder="Ex: Salle 101" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="building" render={({ field }) => (<FormItem><FormLabel>Bâtiment</FormLabel><FormControl><Input placeholder="Ex: Bâtiment A" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="effectif">
                    <Card>
                        <CardHeader><CardTitle>Configuration de l'effectif</CardTitle><CardDescription>Définissez les limites d'effectif pour cette classe.</CardDescription></CardHeader>
                        <CardContent>
                           <FormField
                                control={form.control}
                                name="maxStudents"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre maximum d'élèves *</FormLabel>
                                        <FormControl><Input type="number" min="1" {...field} /></FormControl>
                                        <FormMessage />
                                        {form.getValues("niveauId") && niveaux.find(n => n.id === form.getValues("niveauId")) && (
                                            <p className="text-xs text-muted-foreground pt-1">
                                                Capacité du niveau "{niveaux.find(n => n.id === form.getValues("niveauId"))?.name}": {niveaux.find(n => n.id === form.getValues("niveauId"))?.capacity} élèves.
                                            </p>
                                        )}
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="options">
                    <Card>
                        <CardHeader><CardTitle>Options supplémentaires</CardTitle><CardDescription>Paramètres avancés et notes.</CardDescription></CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="status" render={({ field }) => (<FormItem className="flex items-center justify-between"><FormLabel>Classe active</FormLabel><FormControl><Switch checked={field.value === 'active'} onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes internes</FormLabel><FormControl><Textarea placeholder="Informations supplémentaires..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end pt-6">
                <Button type="submit" disabled={isSubmitting}>
                    <Save className="mr-2 h-4 w-4" />Créer la classe
                </Button>
            </div>
        </form>
      </Form>
    </div>

    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la création</AlertDialogTitle>
                <AlertDialogDescription>
                    Vous êtes sur le point de créer la classe <strong>{formValues?.name}</strong> pour l'année scolaire <strong>{formValues?.academicYear}</strong>.
                    Voulez-vous continuer ?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmCreate} disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</> : "Confirmer"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
