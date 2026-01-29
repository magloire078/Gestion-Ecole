'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useUser, useStorage } from "@/firebase";
import { collection, addDoc, serverTimestamp, writeBatch, doc, increment, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { ArrowRight, ArrowLeft, User, Users, GraduationCap, Upload, X, Loader2 } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { class_type as Class, fee as Fee, niveau as Niveau } from '@/lib/data-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { v4 as uuidv4 } from 'uuid';

const registrationSchema = z.object({
  // Step 1
  lastName: z.string().min(1, { message: "Le nom de famille est requis." }),
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  photoUrl: z.string().optional(),
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

const step1Fields: (keyof RegistrationFormValues)[] = ['lastName', 'firstName', 'matricule', 'dateOfBirth', 'placeOfBirth', 'gender', 'address', 'photoUrl'];
const step2Fields: (keyof RegistrationFormValues)[] = ['previousSchool', 'classId', 'status'];
const step3Fields: (keyof RegistrationFormValues)[] = ['parent1LastName', 'parent1FirstName', 'parent1Contact', 'parent2LastName', 'parent2FirstName', 'parent2Contact'];

export default function RegistrationPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const router = useRouter();
  const { toast } = useToast();
  const { schoolId, loading: schoolDataLoading } = useSchoolData();
  const { user } = useUser();

  const [step, setStep] = useState(1);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/classes`)) : null, [firestore, schoolId]);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  const classes: Class[] = useMemo(() => classesData?.map(d => ({ id: d.id, ...d.data() } as Class)) || [], [classesData]);

  const feesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/frais_scolarite`)) : null, [firestore, schoolId]);
  const { data: feesData, loading: feesLoading } = useCollection(feesQuery);
  const fees: Fee[] = useMemo(() => feesData?.map(d => ({ id: d.id, ...d.data() } as Fee)) || [], [feesData]);
  
  const niveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [firestore, schoolId]);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);
  const niveaux: Niveau[] = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau)) || [], [niveauxData]);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
        lastName: '',
        firstName: '',
        matricule: '',
        photoUrl: '',
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

  const watchedClassId = useWatch({ control: form.control, name: 'classId' });

  // Fonction pour gérer le téléchargement de la photo
  const handlePhotoUpload = async (file: File) => {
    if (!file || !storage || !schoolId) return;

    try {
      setUploadingPhoto(true);
      
      // Créer un nom de fichier unique
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const storagePath = `ecoles/${schoolId}/student-photos/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      // Uploader le fichier
      await uploadBytes(storageRef, file);
      
      // Récupérer l'URL de téléchargement
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Mettre à jour l'état et le formulaire
      setPhotoUrl(downloadUrl);
      form.setValue('photoUrl', downloadUrl);
      
      toast({
        title: "Photo téléchargée",
        description: "La photo a été téléchargée avec succès",
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        variant: "destructive",
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger la photo. Veuillez réessayer.",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.match('image.*')) {
      toast({
        variant: "destructive",
        title: "Format invalide",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
      });
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "L'image ne doit pas dépasser 5MB",
      });
      return;
    }

    handlePhotoUpload(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    form.setValue('photoUrl', '');
  };

  const getTuitionFeeForClass = (classId: string) => {
    if (!classId || !classes.length || !niveaux.length || !fees.length) return 0;
    
    const selectedClass = classes.find(c => c.id === classId);
    if (!selectedClass) return 0;

    const gradeName = selectedClass.grade;
    if (!gradeName) return 0;
    
    const feeInfo = fees.find(f => f.grade === gradeName);

    return feeInfo ? parseFloat(feeInfo.amount) : 0;
  };
  
  const handleNextStep = async () => {
      let fieldsToValidate: (keyof RegistrationFormValues)[] = [];
      if (step === 1) fieldsToValidate = step1Fields;
      if (step === 2) fieldsToValidate = step2Fields;
      
      const isValid = await form.trigger(fieldsToValidate);
      if (isValid) {
          setStep(s => Math.min(s + 1, 3));
      }
  };
  
  const handlePrevStep = () => setStep(s => Math.max(s - 1, 1));
  
  const onSubmit = async (values: RegistrationFormValues) => {
    if (!schoolId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "ID de l'école non trouvé. Veuillez rafraîchir la page.",
      });
      return;
    }
    if (!user || !user.uid) {
        toast({ variant: "destructive", title: "Erreur", description: "Utilisateur non authentifié." });
        return;
    }
    
    form.clearErrors();

    const selectedClassInfo = classes.find(c => c.id === values.classId);
    const selectedNiveauInfo = niveaux.find(n => n.id === selectedClassInfo?.niveauId);
    
    const tuitionFee = getTuitionFeeForClass(values.classId);
    const currentYear = new Date().getFullYear();

    const studentData = {
      schoolId,
      matricule: values.matricule,
      lastName: values.lastName,
      firstName: values.firstName,
      dateOfBirth: values.dateOfBirth,
      placeOfBirth: values.placeOfBirth,
      gender: values.gender,
      address: values.address,
      previousSchool: values.previousSchool,
      photoUrl: photoUrl || `https://picsum.photos/seed/${values.matricule}/200`,
      status: values.status,
      classId: values.classId,
      class: selectedClassInfo?.name || 'N/A',
      cycle: selectedClassInfo?.cycleId || 'N/A', 
      grade: selectedNiveauInfo?.name || 'N/A', 
      parent1LastName: values.parent1LastName,
      parent1FirstName: values.parent1FirstName,
      parent1Contact: values.parent1Contact,
      parent2LastName: values.parent2LastName,
      parent2FirstName: values.parent2FirstName,
      parent2Contact: values.parent2Contact,
      parentIds: [], // Initialise le champ parentIds
      tuitionFee: tuitionFee,
      discountAmount: 0,
      discountReason: '',
      amountDue: tuitionFee, 
      tuitionStatus: tuitionFee > 0 ? 'Partiel' : 'Soldé' as const,
      feedback: '',
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      updatedAt: serverTimestamp(),
      inscriptionYear: currentYear,
    };
    
    const batch = writeBatch(firestore);
    
    const newStudentRef = doc(collection(firestore, `ecoles/${schoolId}/eleves`));
    batch.set(newStudentRef, studentData);

    if (selectedClassInfo) {
        const classRef = doc(firestore, `ecoles/${schoolId}/classes`, selectedClassInfo.id!);
        batch.update(classRef, { studentCount: increment(1) });
    }

    try {
        await batch.commit();
        toast({
            title: "Inscription réussie",
            description: `${values.firstName} ${values.lastName} a été inscrit(e) avec succès.`,
        });
        router.push(`/dashboard/dossiers-eleves`);
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}/eleves and /ecoles/${schoolId}/classes`,
            operation: 'create',
            requestResourceData: studentData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const isLoading = schoolDataLoading || feesLoading || classesLoading || niveauxLoading;

  if (isLoading) {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-96 w-full" />
        </div>
    );
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
          <CardDescription>
              Étape {step} sur 3 - Frais de scolarité pour la classe sélectionnée : 
              <span className="font-bold text-primary"> {getTuitionFeeForClass(watchedClassId).toLocaleString('fr-FR')} CFA</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <User className="h-5 w-5"/>Informations de l'Élève
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                      
                      <Avatar 
                        className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingPhoto ? (
                          <AvatarFallback className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </AvatarFallback>
                        ) : (
                          <>
                            <AvatarImage 
                              src={photoUrl || undefined} 
                              alt="Photo de l'élève" 
                              onError={(e) => {
                                // Si l'image ne charge pas, afficher un fallback
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <AvatarFallback className="flex flex-col items-center justify-center space-y-1">
                              {photoUrl ? (
                                <div className="text-xs text-center">Erreur de chargement</div>
                              ) : (
                                <>
                                  <Upload className="h-6 w-6 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Ajouter photo</span>
                                </>
                              )}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      
                      {photoUrl && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={handleRemovePhoto}
                          disabled={uploadingPhoto}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex-1 w-full space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField 
                          control={form.control} 
                          name="lastName" 
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: GUEYE" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                        <FormField 
                          control={form.control} 
                          name="firstName" 
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prénom(s)</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Adama" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                      </div>
                      <FormField 
                        control={form.control} 
                        name="matricule" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numéro Matricule</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField 
                      control={form.control} 
                      name="dateOfBirth" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de naissance</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                    <FormField 
                      control={form.control} 
                      name="placeOfBirth" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lieu de naissance</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Dakar" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField 
                      control={form.control} 
                      name="gender" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sexe</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner le sexe" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Masculin">Masculin</SelectItem>
                              <SelectItem value="Féminin">Féminin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                    <FormField 
                      control={form.control} 
                      name="address" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse (optionnel)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Cité Keur Gorgui, Villa 123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                  </div>
                </div>
              )}
              
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary"><GraduationCap className="h-5 w-5"/>Informations Scolaires</div>
                  <FormField control={form.control} name="previousSchool" render={({ field }) => (<FormItem><FormLabel>Ancien établissement (si applicable)</FormLabel><FormControl><Input placeholder="Ex: Lycée Lamine Gueye" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="classId" render={({ field }) => (<FormItem><FormLabel>Classe souhaitée</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={classesLoading ? "Chargement..." : "Sélectionner une classe"} /></SelectTrigger></FormControl><SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
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
                    <span className="flex items-center gap-2"><ArrowLeft className="mr-2 h-4 w-4" /> Précédent</span>
                  </Button>
                ) : <div />}
                {step < 3 ? (
                  <Button type="button" onClick={handleNextStep}>
                    <span className="flex items-center gap-2">Suivant <ArrowRight className="ml-2 h-4 w-4" /></span>
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
    