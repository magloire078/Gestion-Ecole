'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore, useUser } from '@/firebase';
import { collection, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { StudentService } from '@/services/student-services';
import { ImageUploader } from '@/components/image-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Loader2, CheckCircle2, User, Plus, Trash2 } from 'lucide-react';
import type { class_type as Class, fee as Fee, niveau as Niveau } from '@/lib/data-types';
import { getTuitionInfoForClass } from '@/lib/school-utils';
import { formatCurrency } from '@/lib/currency-utils';

const paymentSchema = z.object({
  amount: z.string().min(1, "Requis"),
  date: z.string(),
  method: z.enum(['Espèce', 'Mobile Money', 'Chèque', 'Virement']),
});

const registrationModalSchema = z.object({
  // Colonne 1: Élève
  lastName: z.string().min(1, "Le nom est requis"),
  firstName: z.string().min(1, "Le prénom est requis"),
  dateOfBirth: z.string().min(1, "La date de naissance est requise"),
  placeOfBirth: z.string().optional(),
  gender: z.enum(['Masculin', 'Féminin']),
  nationality: z.string().default('Ivoirienne'),
  statusAff: z.enum(['Affecté', 'Non-Affecté']).default('Non-Affecté'),
  isRepeater: z.enum(['Oui', 'Non']).default('Non'),

  // Colonne 2: Parents & Photo
  photoUrl: z.string().optional(),
  parent1LastName: z.string().min(1, "Le nom du parent est requis"),
  parent1FirstName: z.string().min(1, "Le prénom du parent est requis"),
  parent1Contact: z.string().min(1, "Le numéro de contact est requis"),
  parent1Email: z.string().email("Email invalide").optional().or(z.literal('')),
  
  // Colonne 3: Scolarité & Paiement
  classId: z.string().min(1, "Veuillez choisir une classe"),
  fraisInscription: z.string().default('0'),
  fraisScolarite: z.string().default('0'),
  fraisAnnexe: z.string().default('0'),
  
  isSimplifiedMode: z.boolean().default(true),
  paymentAmount: z.string().default('0'),
  paymentMethod: z.enum(['Espèce', 'Mobile Money', 'Chèque', 'Virement']).default('Espèce'),
  paymentDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  
  payments: z.array(paymentSchema).default([]),
  
  notifySMS: z.boolean().default(false),
});

type RegistrationModalValues = z.infer<typeof registrationModalSchema>;

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  schoolData: any;
  classes: Class[];
  niveaux: Niveau[];
  fees: Fee[];
}

export function RegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  schoolData,
  classes,
  niveaux,
  fees,
}: RegistrationModalProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegistrationModalValues>({
    resolver: zodResolver(registrationModalSchema),
    defaultValues: {
      lastName: '',
      firstName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      gender: 'Masculin',
      nationality: 'Ivoirienne',
      statusAff: 'Non-Affecté',
      isRepeater: 'Non',
      photoUrl: '',
      parent1LastName: '',
      parent1FirstName: '',
      parent1Contact: '',
      parent1Email: '',
      classId: '',
      fraisInscription: '0',
      fraisScolarite: '0',
      fraisAnnexe: '0',
      isSimplifiedMode: true,
      paymentAmount: '0',
      paymentMethod: 'Espèce',
      paymentDate: new Date().toISOString().split('T')[0],
      payments: [{ amount: '0', date: new Date().toISOString().split('T')[0], method: 'Espèce' }],
      notifySMS: false,
    },
  });

  const watchedClassId = form.watch('classId');
  const watchedStatusAff = form.watch('statusAff');

  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({
    control: form.control,
    name: "payments",
  });
  const watchedSimplified = form.watch('isSimplifiedMode');


  // Détermination des frais de scolarité de la classe sélectionnée
  const classFeeInfo = useMemo(() => {
    if (!watchedClassId) return 0;
    const selectedClass = classes.find(c => c.id === watchedClassId);
    if (!selectedClass) return 0;

    const { fee } = getTuitionInfoForClass(watchedClassId, classes, niveaux, fees);
    
    // Si l'élève est Affecté, on applique éventuellement un tarif réduit d'État si spécifié,
    // sinon on prend le tarif de scolarité standard.
    return fee;
  }, [watchedClassId, classes, niveaux, fees]);

  const handleSubmit = async (values: RegistrationModalValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const selectedClass = classes.find(c => c.id === values.classId);
      const selectedNiveau = niveaux.find(n => n.id === selectedClass?.niveauId);
      const currentYear = schoolData?.currentAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

      const studentData: any = {
        schoolId,
        matricule: `MAT-${Math.floor(100000 + Math.random() * 900000)}`,
        lastName: values.lastName,
        firstName: values.firstName,
        dateOfBirth: values.dateOfBirth,
        placeOfBirth: values.placeOfBirth || '',
        gender: values.gender,
        nationality: values.nationality,
        statusAff: values.statusAff,
        isRepeater: values.isRepeater === 'Oui',
        cycle: selectedClass?.cycleId || 'Secondaire', // Déduit
        photoURL: values.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${values.firstName} ${values.lastName}`,
        classId: values.classId,
        class: selectedClass?.name || 'N/A',
        grade: selectedNiveau?.name || 'N/A',
        status: 'Actif',
        parent1LastName: values.parent1LastName,
        parent1FirstName: values.parent1FirstName,
        parent1Contact: values.parent1Contact,
        parent1Email: values.parent1Email || '',
        parentIds: [],
        tuitionFee: classFeeInfo,
        amountDue: classFeeInfo,
        tuitionStatus: classFeeInfo === 0 ? 'Soldé' : 'Partiel',
        inscriptionYear: parseInt(currentYear.split('-')[0]),
        academicYear: currentYear,
        createdAt: serverTimestamp(),
      };

      // Enregistrement de l'élève
      const newStudentId = await StudentService.createStudent(schoolId, studentData, user.uid);

      // Si paiement initial supérieur à 0, on crée un ou plusieurs versements/reçus
      const paymentsToProcess = values.isSimplifiedMode 
        ? [{ amount: parseFloat(values.paymentAmount), date: values.paymentDate, method: values.paymentMethod }]
        : values.payments.map(p => ({ amount: parseFloat(p.amount), date: p.date, method: p.method }));

      for (const p of paymentsToProcess) {
        if (p.amount > 0) {
          const paymentData = {
            studentId: newStudentId,
            amount: p.amount,
            date: p.date,
            method: p.method,
            reference: `REC-${Date.now().toString().slice(-6)}`,
            academicYear: currentYear,
            notes: 'Paiement initial lors de l\'inscription',
            createdAt: serverTimestamp(),
          };
          const paymentRef = doc(collection(firestore, `ecoles/${schoolId}/eleves/${newStudentId}/paiements`));
          await setDoc(paymentRef, paymentData);
        }
      }

      toast({
        title: "Élève inscrit !",
        description: `${values.firstName} ${values.lastName} a été enregistré avec succès.`,
      });

      onSuccess();
      onClose();
      form.reset();
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error?.message || "Impossible d'inscrire l'élève.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full p-6 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="border-b pb-4 mb-4">
          <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <User className="h-6 w-6 text-indigo-600 animate-pulse" /> Saisie d&apos;une Nouvelle Inscription
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 bg-slate-50/50 p-2 md:p-4 rounded-[2rem]">
              
              {/* Colonne 1 : Saisie Administrative de l'Élève */}
              <div className="space-y-4 bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100 hover:-translate-y-1 transition-all duration-500">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">1. Informations Élève</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Nom *</FormLabel>
                      <FormControl><Input placeholder="Ex: KOFFI" className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Prénoms *</FormLabel>
                      <FormControl><Input placeholder="Ex: Jean-Marie" className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Né(e) le *</FormLabel>
                      <FormControl><Input type="date" className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="placeOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Lieu de Naissance</FormLabel>
                      <FormControl><Input placeholder="Ex: Abidjan" className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Sexe *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="Masculin">Masculin</SelectItem><SelectItem value="Féminin">Féminin</SelectItem></SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="nationality" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Nationalité</FormLabel>
                      <FormControl><Input placeholder="Ex: Ivoirienne" className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <FormField control={form.control} name="statusAff" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Statut Côte d&apos;Ivoire</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Non-Affecté">Non-Affecté (Privé)</SelectItem>
                          <SelectItem value="Affecté">Affecté de l&apos;État</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="isRepeater" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Redoublant ?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Non">Non</SelectItem>
                          <SelectItem value="Oui">Oui</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Colonne 2 : Contacts Parents & Téléchargement Photo */}
              <div className="space-y-4 bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100 hover:-translate-y-1 transition-all duration-500">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">2. Parents & Contact</h3>

                <div className="flex justify-center mb-4">
                  <FormField control={form.control} name="photoUrl" render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Photo d&apos;identité</FormLabel>
                      <FormControl>
                        <ImageUploader
                          onUploadComplete={(url) => field.onChange(url)}
                          storagePath={`ecoles/${schoolId}/student-photos/`}
                          currentImageUrl={field.value}
                          resizeWidth={400}
                        >
                          <Avatar className="h-24 w-24 cursor-pointer hover:opacity-85 transition-opacity ring-2 ring-indigo-100">
                            <AvatarImage src={field.value || undefined} />
                            <AvatarFallback className="bg-slate-50 flex flex-col items-center justify-center space-y-1">
                              <Upload className="h-5 w-5 text-indigo-500" />
                              <span className="text-[10px] text-slate-400">Ajouter</span>
                            </AvatarFallback>
                          </Avatar>
                        </ImageUploader>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="parent1LastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Nom du Parent 1 *</FormLabel>
                      <FormControl><Input placeholder="Ex: KOFFI" className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="parent1FirstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Prénom du Parent 1 *</FormLabel>
                      <FormControl><Input placeholder="Ex: Charles" className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="parent1Contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">N° Téléphone Parent 1 *</FormLabel>
                    <FormControl><Input placeholder="Ex: +225 0700000000" className="rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="parent1Email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Email Parent 1 (optionnel)</FormLabel>
                    <FormControl><Input type="email" placeholder="parent@mail.com" className="rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Colonne 3 : Classe & Scolarité / Règlement */}
              <div className="space-y-4 bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100 hover:-translate-y-1 transition-all duration-500">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">3. Classe & Paiement</h3>

                <FormField control={form.control} name="classId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Classe Affectée *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-slate-500 font-black text-xs uppercase tracking-widest">Montant à payer par rubrique</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(classFeeInfo)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <FormField control={form.control} name="fraisInscription" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase text-slate-400 font-bold">Inscription</FormLabel>
                        <FormControl><Input type="number" className="rounded-lg font-mono text-xs h-8" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fraisScolarite" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase text-slate-400 font-bold">Scolarité</FormLabel>
                        <FormControl><Input type="number" className="rounded-lg font-mono text-xs h-8" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fraisAnnexe" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase text-slate-400 font-bold">Annexe</FormLabel>
                        <FormControl><Input type="number" className="rounded-lg font-mono text-xs h-8" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-emerald-600 flex items-center gap-2">
                      <span className="bg-emerald-100 p-1 rounded-md">$</span> Paiements
                    </h4>
                    <FormField control={form.control} name="isSimplifiedMode" render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="text-xs text-slate-500">Mode simplifié</FormLabel>
                      </FormItem>
                    )} />
                  </div>

                  {watchedSimplified ? (
                    <div className="grid grid-cols-12 gap-2 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                      <div className="col-span-4">
                        <FormField control={form.control} name="paymentAmount" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Montant</FormLabel>
                            <FormControl><Input type="number" min="0" className="rounded-lg font-mono text-xs h-8 bg-white" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                      <div className="col-span-4">
                        <FormField control={form.control} name="paymentDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Date</FormLabel>
                            <FormControl><Input type="date" className="rounded-lg text-xs h-8 bg-white" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                      <div className="col-span-4">
                        <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Mode</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger className="rounded-lg h-8 text-xs bg-white"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="Espèce">Espèces</SelectItem>
                                <SelectItem value="Mobile Money">Mobile M.</SelectItem>
                                <SelectItem value="Chèque">Chèque</SelectItem>
                                <SelectItem value="Virement">Virement</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 px-2">
                        <div className="col-span-4 text-[10px] font-bold uppercase text-slate-400">Montant</div>
                        <div className="col-span-4 text-[10px] font-bold uppercase text-slate-400">Date</div>
                        <div className="col-span-3 text-[10px] font-bold uppercase text-slate-400">Mode</div>
                      </div>
                      {paymentFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-emerald-50/30 p-2 rounded-xl border border-emerald-100/50">
                          <div className="col-span-4">
                            <FormField control={form.control} name={`payments.${index}.amount`} render={({ field }) => (
                              <FormItem><FormControl><Input type="number" className="rounded-lg font-mono text-xs h-8 bg-white" {...field} /></FormControl></FormItem>
                            )} />
                          </div>
                          <div className="col-span-4">
                            <FormField control={form.control} name={`payments.${index}.date`} render={({ field }) => (
                              <FormItem><FormControl><Input type="date" className="rounded-lg text-xs h-8 bg-white" {...field} /></FormControl></FormItem>
                            )} />
                          </div>
                          <div className="col-span-3">
                            <FormField control={form.control} name={`payments.${index}.method`} render={({ field }) => (
                              <FormItem>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger className="rounded-lg h-8 text-xs bg-white px-2"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="Espèce">Espèces</SelectItem>
                                    <SelectItem value="Mobile Money">Mobile M.</SelectItem>
                                    <SelectItem value="Chèque">Chèque</SelectItem>
                                    <SelectItem value="Virement">Virement</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(index)} className="h-6 w-6 text-rose-500 hover:bg-rose-50 rounded-full">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => appendPayment({ amount: '0', date: new Date().toISOString().split('T')[0], method: 'Espèce' })}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 w-full mt-2 text-xs h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Ajouter un paiement
                      </Button>
                    </div>
                  )}
                </div>

                <FormField control={form.control} name="notifySMS" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-4 bg-slate-50/50">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs font-bold text-slate-700 cursor-pointer">
                        Notifier le parent par SMS
                      </FormLabel>
                      <p className="text-[10px] text-slate-400">
                        Envoie un reçu de paiement et de validation par SMS.
                      </p>
                    </div>
                  </FormItem>
                )} />
              </div>

            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-xl">
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 transition-all hover:scale-105 active:scale-95">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Inscription...
                  </>
                ) : (
                  <>
                    Valider l&apos;Inscription <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
