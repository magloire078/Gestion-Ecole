
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, writeBatch, query, where } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { ArrowLeft } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { schoolClasses, schoolCycles, higherEdFiliere } from '@/lib/data';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { staff as Staff, class_type as Class } from '@/lib/data-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// Define Zod schema for validation
const classSchema = z.object({
  cycle: z.string().min(1, { message: "Le cycle est requis." }),
  grade: z.string().min(1, { message: "Le niveau est requis." }),
  name: z.string().min(1, { message: "Le nom de la classe est requis." }),
  filiere: z.string().optional(),
  building: z.string().min(1, { message: "Le bâtiment est requis." }),
  mainTeacherId: z.string().min(1, { message: "Le professeur principal est requis." }),
  // Fee fields
  amount: z.string().min(1, { message: "Le montant est requis." }),
  installments: z.string().min(1, { message: "Les modalités de paiement sont requises." }),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface StaffWithId extends Staff {
  id: string;
}


export default function NewClassPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolDataLoading } = useSchoolData();
  const router = useRouter();
  const { toast } = useToast();

  const personnelQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'enseignant')) : null, [firestore, schoolId]);
  const { data: personnelData, loading: personnelLoading } = useCollection(personnelQuery);
  const teachers: StaffWithId[] = useMemo(() => personnelData?.map(d => ({ id: d.id, ...d.data() } as StaffWithId)) || [], [personnelData]);


  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      cycle: '', grade: '', name: '', filiere: '', building: '', mainTeacherId: '', amount: '', installments: '',
    },
  });

  const watchedCycle = form.watch('cycle');

  const handleClassSubmit = async (values: ClassFormValues) => {
    if (!schoolId) {
        toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
        return;
    }
    
    const classData = {
        schoolId,
        cycle: values.cycle,
        grade: values.grade,
        name: values.name,
        filiere: values.cycle === "Enseignement Supérieur" ? values.filiere : "",
        building: values.building,
        mainTeacherId: values.mainTeacherId,
        studentCount: 0,
    };
    
    const feeData = {
        schoolId,
        grade: values.grade, // Use grade for the fee link
        amount: values.amount,
        installments: values.installments,
        details: `Frais pour la classe ${values.name}`,
    };

    const batch = writeBatch(firestore);

    try {
        const newClassRef = doc(collection(firestore, `ecoles/${schoolId}/classes`));
        batch.set(newClassRef, classData);

        const newFeeRef = doc(collection(firestore, `ecoles/${schoolId}/frais_scolarite`));
        batch.set(newFeeRef, feeData);
        
        await batch.commit();
        toast({ title: "Classe et Frais ajoutés", description: `La classe ${values.name} et sa grille tarifaire ont été créées.` });
        router.push('/dashboard/classes');
    } catch(serverError) {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}/classes & /ecoles/${schoolId}/frais_scolarite`,
            operation: 'create',
            requestResourceData: { classData, feeData }
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleOpenAddTeacherDialog = async (teacherName: string) => {
    // This is a placeholder as the dialog is not implemented on this page.
    toast({ title: 'Fonctionnalité non disponible ici', description: 'Veuillez ajouter les enseignants depuis la page RH.' });
    return null;
  }

  const isLoading = schoolDataLoading || personnelLoading;
  
  const teacherOptions = teachers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }));
  const cycleOptions = schoolCycles.map(c => ({ value: c.name, label: c.name }));
  const gradeOptions = schoolClasses.filter(c => c.cycle === watchedCycle).map(c => ({ value: c.name, label: c.name }));
  const filiereOptions = higherEdFiliere.map(f => ({ value: f, label: f }));

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="w-fit">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à la liste des classes
      </Button>
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Ajouter une nouvelle classe</CardTitle>
          <CardDescription>Renseignez les informations de la nouvelle classe et sa grille tarifaire associée.</CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleClassSubmit)}>
                <CardContent>
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="general">Informations Générales</TabsTrigger>
                            <TabsTrigger value="fees">Scolarité</TabsTrigger>
                        </TabsList>
                        <div className="py-4 max-h-[60vh] overflow-y-auto px-1">
                            <TabsContent value="general" className="mt-0 space-y-4">
                                <FormField control={form.control} name="cycle" render={({ field }) => ( <FormItem> <FormLabel>Cycle</FormLabel> <FormControl> <Combobox placeholder="Sélectionner un cycle" searchPlaceholder="Chercher un cycle..." options={cycleOptions} value={field.value} onValueChange={(value) => { field.onChange(value); form.setValue('grade', ''); form.setValue('name', ''); form.setValue('filiere', ''); }} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                {watchedCycle && <FormField control={form.control} name="grade" render={({ field }) => ( <FormItem> <FormLabel>Niveau</FormLabel> <FormControl> <Combobox placeholder="Sélectionner un niveau" searchPlaceholder="Chercher un niveau..." options={gradeOptions} value={field.value} onValueChange={(value) => { field.onChange(value); form.setValue('name', value); }}/> </FormControl> <FormMessage /> </FormItem> )}/>}
                                {watchedCycle === "Enseignement Supérieur" && <FormField control={form.control} name="filiere" render={({ field }) => ( <FormItem> <FormLabel>Filière</FormLabel> <FormControl> <Combobox placeholder="Sélectionner une filière" searchPlaceholder="Chercher une filière..." options={filiereOptions} value={field.value} onValueChange={field.onChange}/> </FormControl> </FormItem> )}/>}
                                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nom Complet de la Classe</FormLabel> <FormControl> <Input placeholder="Ex: CM2 A, Terminale D, etc." {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="building" render={({ field }) => ( <FormItem> <FormLabel>Bâtiment</FormLabel> <FormControl> <Input placeholder="Ex: Bâtiment A" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="mainTeacherId" render={({ field }) => ( <FormItem> <FormLabel>Prof. Principal</FormLabel> <FormControl> <Combobox placeholder="Sélectionner un enseignant" searchPlaceholder="Chercher ou créer..." options={teacherOptions} value={field.value} onValueChange={field.onChange} onCreate={handleOpenAddTeacherDialog}/> </FormControl> <FormMessage /> </FormItem> )}/>
                            </TabsContent>
                            <TabsContent value="fees" className="mt-0 space-y-4">
                                <p className="text-sm text-muted-foreground">Définissez les frais de scolarité qui seront associés à cette classe. Ces informations peuvent être modifiées plus tard dans la section "Frais de Scolarité".</p>
                                <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem> <FormLabel>Montant Total (CFA)</FormLabel> <FormControl> <Input type="number" placeholder="Ex: 980000" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="installments" render={({ field }) => ( <FormItem> <FormLabel>Modalités de Paiement</FormLabel> <FormControl> <Input placeholder="Ex: 10 tranches mensuelles" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                        {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer la Classe'}
                    </Button>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}
