
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { ArrowRight, ArrowLeft, User, Users, GraduationCap } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { schoolClasses } from '@/lib/data';

interface Class {
  id: string;
  name: string;
  cycle: string;
}

const registrationSchema = z.object({
  // Step 1
  lastName: z.string().min(1, { message: "Le nom de famille est requis." }),
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  matricule: z.string().min(1, { message: "Le numéro matricule est requis." }),
  dateOfBirth: z.string().min(1, { message: "La date de naissance est requise." }),
  placeOfBirth: z.string().min(1, { message: "Le lieu de naissance est requis." }),
  gender: z.enum(['Masculin', 'Féminin'], { required_error: "Le sexe est requis." }),
  address: z.string().optional(),
  
  // Step 2
  previousSchool: z.string().optional(),
  classId: z.string().min(1, { message: "La classe souhaitée est requise." }),
  status: z.enum(['Actif', 'En attente'], { required_error: "Le statut est requis." }),

  // Step 3
  parent1LastName: z.string().min(1, { message: "Le nom du parent 1 est requis." }),
  parent1FirstName: z.string().min(1, { message: "Le prénom du parent 1 est requis." }),
  parent1Contact: z.string().min(1, { message: "Le contact du parent 1 est requis." }),
  parent2LastName: z.string().optional(),
  parent2FirstName: z.string().optional(),
  parent2Contact: z.string().optional(),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

const step1Fields: (keyof RegistrationFormValues)[] = ['lastName', 'firstName', 'matricule', 'dateOfBirth', 'placeOfBirth', 'gender', 'address'];
const step2Fields: (keyof RegistrationFormValues)[] = ['previousSchool', 'classId', 'status'];
const step3Fields: (keyof RegistrationFormValues)[] = ['parent1LastName', 'parent1FirstName', 'parent1Contact', 'parent2LastName', 'parent2FirstName', 'parent2Contact'];


export default function RegistrationPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { schoolId, loading: schoolDataLoading } = useSchoolData();

  const [step, setStep] = useState(1);

  const classesQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/classes`) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
        lastName: '',
        firstName: '',
        matricule: '',
        dateOfBirth: '',
        placeOfBirth: '',
        gender: undefined,
        address: '',
        previousSchool: '',
        classId: '',
        status: 'Actif',
        parent1LastName: '',
        parent1FirstName: '',
        parent1Contact: '',
        parent2LastName: '',
        parent2FirstName: '',
        parent2Contact: '',
    }
  });
  
  const handleNextStep = async () => {
      let fieldsToValidate: (keyof RegistrationFormValues)[] = [];
      if (step === 1) fieldsToValidate = step1Fields;
      if (step === 2) fieldsToValidate = step2Fields;
      
      const isValid = await form.trigger(fieldsToValidate);
      if (isValid) {
          setStep(s => Math.min(s + 1, 3));
      }
  }
  const handlePrevStep = () => setStep(s => Math.max(s - 1, 1));
  
  const onSubmit = (values: RegistrationFormValues) => {
    if (!schoolId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "ID de l'école non trouvé. Veuillez rafraîchir la page.",
      });
      return;
    }
    
    form.clearErrors();

    const selectedClassInfo = classes.find(c => c.id === values.classId);
    const schoolClassInfo = schoolClasses.find(sc => sc.name === selectedClassInfo?.name);
    const studentCycle = schoolClassInfo?.cycle || selectedClassInfo?.cycle || 'N/A';

    const studentData = {
      matricule: values.matricule,
      lastName: values.lastName,
      firstName: values.firstName,
      dateOfBirth: values.dateOfBirth,
      placeOfBirth: values.placeOfBirth,
      gender: values.gender,
      address: values.address,
      previousSchool: values.previousSchool,
      photoUrl: `https://picsum.photos/seed/${values.matricule}/200`,
      status: values.status,
      classId: values.classId,
      class: selectedClassInfo?.name || 'N/A',
      cycle: studentCycle,
      parent1LastName: values.parent1LastName,
      parent1FirstName: values.parent1FirstName,
      parent1Contact: values.parent1Contact,
      parent2LastName: values.parent2LastName,
      parent2FirstName: values.parent2FirstName,
      parent2Contact: values.parent2Contact,
      amountDue: 0, 
      tuitionStatus: 'Partiel' as const,
      feedback: '',
      createdAt: serverTimestamp(),
    };

    const studentsCollectionRef = collection(firestore, `ecoles/${schoolId}/eleves`);
    addDoc(studentsCollectionRef, studentData)
    .then((docRef) => {
        toast({
            title: "Inscription réussie",
            description: `${values.firstName} ${values.lastName} a été inscrit(e) avec succès.`,
        });
        router.push(`/dashboard/students`);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: studentsCollectionRef.path, operation: 'create', requestResourceData: studentData });
        errorEmitter.emit('permission-error', permissionError);
    })
  };

  if (schoolDataLoading) {
    return <div>Chargement...</div>;
  }
  
  const { formState: { isSubmitting } } = form;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Nouvelle Inscription</h1>
        <p className="text-muted-foreground">Suivez les étapes pour inscrire un nouvel élève.</p>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Formulaire d'Inscription</CardTitle>
          <CardDescription>Étape {step} sur 3</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary"><User className="h-5 w-5"/>Informations de l'Élève</div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Ex: GUEYE" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom(s)</FormLabel><FormControl><Input placeholder="Ex: Adama" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                   <FormField control={form.control} name="matricule" render={({ field }) => (<FormItem><FormLabel>Numéro Matricule</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="dateOfBirth" render={({ field }) => (<FormItem><FormLabel>Date de naissance</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="placeOfBirth" render={({ field }) => (<FormItem><FormLabel>Lieu de naissance</FormLabel><FormControl><Input placeholder="Ex: Dakar" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Sexe</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner le sexe" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Masculin">Masculin</SelectItem><SelectItem value="Féminin">Féminin</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Adresse (optionnel)</FormLabel><FormControl><Input placeholder="Ex: Cité Keur Gorgui, Villa 123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </div>
              )}
              
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary"><GraduationCap className="h-5 w-5"/>Informations Scolaires</div>
                  <FormField control={form.control} name="previousSchool" render={({ field }) => (<FormItem><FormLabel>Ancien établissement (si applicable)</FormLabel><FormControl><Input placeholder="Ex: Lycée Lamine Gueye" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="classId" render={({ field }) => (<FormItem><FormLabel>Classe souhaitée</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={classesLoading ? "Chargement..." : "Sélectionner une classe"} /></SelectTrigger></FormControl><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut de l'inscription</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Actif">Actif / Inscrit</SelectItem><SelectItem value="En attente">En attente / Pré-inscrit</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  </div>
                </div>
              )}
              
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary"><Users className="h-5 w-5"/>Informations des Parents/Tuteurs</div>
                  <div className="p-4 border rounded-lg space-y-4">
                      <h4 className="font-medium">Parent 1</h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="parent1LastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Nom du parent 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="parent1FirstName" render={({ field }) => (<FormItem><FormLabel>Prénom(s)</FormLabel><FormControl><Input placeholder="Prénom(s) du parent 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <FormField control={form.control} name="parent1Contact" render={({ field }) => (<FormItem><FormLabel>Contact (Téléphone)</FormLabel><FormControl><Input placeholder="Numéro de téléphone" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="p-4 border rounded-lg space-y-4">
                      <h4 className="font-medium">Parent 2 (optionnel)</h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                         <FormField control={form.control} name="parent2LastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Nom du parent 2" {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="parent2FirstName" render={({ field }) => (<FormItem><FormLabel>Prénom(s)</FormLabel><FormControl><Input placeholder="Prénom(s) du parent 2" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <FormField control={form.control} name="parent2Contact" render={({ field }) => (<FormItem><FormLabel>Contact (Téléphone)</FormLabel><FormControl><Input placeholder="Numéro de téléphone" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                  </Button>
                ) : <div />}
                {step < 3 ? (
                  <Button type="button" onClick={handleNextStep}>
                    Suivant <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Inscription en cours...' : 'Soumettre l\'Inscription'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
