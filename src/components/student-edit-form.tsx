
'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import type { student as Student, class_type as Class, fee as Fee, niveau as Niveau } from '@/lib/data-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogFooter } from './ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getTuitionInfoForClass } from '@/lib/school-utils';


const studentSchema = z.object({
  firstName: z.string().min(1, { message: "Le prénom est requis." }),
  lastName: z.string().min(1, { message: "Le nom est requis." }),
  classId: z.string().min(1, { message: "La classe est requise." }),
  dateOfBirth: z.string().min(1, { message: "La date de naissance est requise." }),
  tuitionFee: z.coerce.number().min(0, "Les frais de scolarité doivent être positifs."),
  discountAmount: z.coerce.number().min(0, "La remise doit être un nombre positif."),
  discountReason: z.string().optional(),
  amountDue: z.coerce.number().min(0, "Le montant dû ne peut pas être négatif."),
  tuitionStatus: z.enum(['Soldé', 'En retard', 'Partiel']),
  status: z.enum(['Actif', 'En attente', 'Transféré', 'Diplômé', 'Radié']),
  feedback: z.string().optional(),
  grade: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentEditFormProps {
  student: Student;
  classes: (Class & { id?: string })[];
  fees: Fee[];
  niveaux: (Niveau & { id?: string })[];
  schoolId: string;
  onFormSubmit: () => void;
}

export function StudentEditForm({ student, classes, fees, niveaux, schoolId, onFormSubmit }: StudentEditFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [showFeeWarning, setShowFeeWarning] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      classId: student.classId || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '', // Assurer le format YYYY-MM-DD
      tuitionFee: student.tuitionFee || 0,
      discountAmount: student.discountAmount || 0,
      discountReason: student.discountReason || '',
      amountDue: student.amountDue || 0,
      tuitionStatus: student.tuitionStatus || 'Partiel',
      status: student.status || 'Actif',
      feedback: student.feedback || '',
      grade: student.grade || '',
    },
  });

  const watchedClassId = useWatch({ control: form.control, name: 'classId' });
  const watchedDiscountAmount = useWatch({ control: form.control, name: 'discountAmount' });

  // Effet pour recalculer les montants lorsque la classe ou la remise change
  useEffect(() => {
    const { fee: newTuitionFee, gradeName } = getTuitionInfoForClass(watchedClassId, classes, niveaux, fees);

    // Show warning if no fee is defined for the selected class
    if (watchedClassId && newTuitionFee === 0) {
      setShowFeeWarning(true);
    } else {
      setShowFeeWarning(false);
    }

    // Mettre à jour les frais de scolarité
    form.setValue('tuitionFee', newTuitionFee, { shouldValidate: true });
    form.setValue('grade', gradeName, { shouldValidate: true });

    const currentDiscount = watchedDiscountAmount || 0;
    const newAmountDue = Math.max(0, newTuitionFee - currentDiscount);
    form.setValue('amountDue', newAmountDue, { shouldValidate: true });

  }, [watchedClassId, watchedDiscountAmount, classes, fees, niveaux, form]);


  const handleEditStudent = async (values: StudentFormValues) => {
    if (!user?.uid) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non authentifié.' });
      return;
    }
    setIsSaving(true);
    const oldClassId = student.classId;
    const newClassId = values.classId;
    const classHasChanged = oldClassId !== newClassId;

    const studentDocRef = doc(firestore, `ecoles/${schoolId}/eleves/${student.id!}`);
    const selectedClassInfo = classes.find(c => c.id === newClassId);

    const batch = writeBatch(firestore);

    const updatedData = {
      ...student,
      firstName: values.firstName,
      lastName: values.lastName,
      classId: newClassId,
      class: selectedClassInfo?.name || student.class,
      cycle: selectedClassInfo?.cycleId || student.cycle,
      grade: values.grade || 'N/A',
      dateOfBirth: values.dateOfBirth,
      tuitionFee: values.tuitionFee,
      discountAmount: values.discountAmount,
      discountReason: values.discountReason,
      amountDue: values.amountDue,
      tuitionStatus: values.tuitionStatus,
      status: values.status,
      feedback: values.feedback || '',
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    batch.update(studentDocRef, updatedData);

    if (classHasChanged) {
      if (oldClassId) {
        const oldClassRef = doc(firestore, `ecoles/${schoolId}/classes/${oldClassId}`);
        batch.update(oldClassRef, { studentCount: increment(-1) });
      }
      const newClassRef = doc(firestore, `ecoles/${schoolId}/classes/${newClassId}`);
      batch.update(newClassRef, { studentCount: increment(1) });
    }

    try {
      await batch.commit();
      toast({ title: "Élève modifié", description: `Les informations de ${values.firstName} ${values.lastName} ont été mises à jour. ${classHasChanged ? 'Les frais de scolarité ont été recalculés pour la nouvelle classe.' : ''}` });
      onFormSubmit();
    } catch (serverError) {
      console.error("Error updating student:", serverError);
      toast({ variant: "destructive", title: "Erreur de mise à jour", description: "Impossible de modifier les informations de l'élève." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form id={`edit-student-form-${student.id}`} onSubmit={form.handleSubmit(handleEditStudent)} className="space-y-4">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="tuition">Scolarité</TabsTrigger>
            <TabsTrigger value="feedback">Appréciation</TabsTrigger>
          </TabsList>
          <div className="py-4 max-h-[60vh] overflow-y-auto px-1">
            <TabsContent value="general" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (<FormItem><FormLabel>Date de naissance</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classe</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {classes.map((opt) => (<SelectItem key={opt.id} value={opt.id!}>{opt.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut Élève</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="En attente">En attente</SelectItem>
                      <SelectSeparator />
                      <SelectItem value="Transféré">Transféré</SelectItem>
                      <SelectItem value="Diplômé">Diplômé</SelectItem>
                      <SelectItem value="Radié">Radié</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </TabsContent>
            <TabsContent value="tuition" className="mt-0 space-y-4">
              {showFeeWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Attention : Aucun frais de scolarité n&apos;est défini pour la classe sélectionnée. Le solde de cet élève sera recalculé à 0.
                  </AlertDescription>
                </Alert>
              )}
              <FormField control={form.control} name="tuitionFee" render={({ field }) => (<FormItem><FormLabel>Frais de scolarité (CFA)</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="discountAmount" render={({ field }) => (<FormItem><FormLabel>Remise (CFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="discountReason" render={({ field }) => (<FormItem><FormLabel>Motif de la remise</FormLabel><FormControl><Input placeholder="Ex: Bourse d'excellence" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="amountDue" render={({ field }) => (<FormItem><FormLabel>Solde dû (calculé)</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="tuitionStatus" render={({ field }) => (<FormItem><FormLabel>Statut Paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Soldé">Soldé</SelectItem><SelectItem value="En retard">En retard</SelectItem><SelectItem value="Partiel">Partiel</SelectItem></SelectContent></Select></FormItem>)} />
            </TabsContent>
            <TabsContent value="feedback" className="mt-0">
              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appréciation Générale</FormLabel>
                    <FormControl><Textarea {...field} rows={8} /></FormControl>
                  </FormItem>
                )}
              />
            </TabsContent>
          </div>
        </Tabs>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={onFormSubmit}>Annuler</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
