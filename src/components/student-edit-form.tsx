'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bot, Smile, Frown, Meh } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, writeBatch, increment } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import type { student as Student, class_type as Class, fee as Fee } from '@/lib/data-types';

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
  status: z.enum(['Actif', 'En attente', 'Radié']),
  feedback: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentEditFormProps {
  student: Student;
  classes: Class[];
  fees: Fee[]; // Ajout des frais
  schoolId: string;
  onFormSubmit: () => void;
}

export function StudentEditForm({ student, classes, fees, schoolId, onFormSubmit }: StudentEditFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      classId: student.classId || '',
      dateOfBirth: student.dateOfBirth || '',
      tuitionFee: student.tuitionFee || 0,
      discountAmount: student.discountAmount || 0,
      discountReason: student.discountReason || '',
      amountDue: student.amountDue || 0,
      tuitionStatus: student.tuitionStatus || 'Partiel',
      status: student.status || 'Actif',
      feedback: student.feedback || '',
    },
  });
  
  const watchedClassId = useWatch({ control: form.control, name: 'classId' });
  const watchedDiscountAmount = useWatch({ control: form.control, name: 'discountAmount' });

  // Effet pour recalculer les montants lorsque la classe ou la remise change
  useEffect(() => {
    const newClass = classes.find(c => c.id === watchedClassId);
    let newTuitionFee = form.getValues('tuitionFee');

    // Mettre à jour les frais de scolarité uniquement si la classe change
    if (watchedClassId !== student.classId && newClass) {
        const feeForNewClass = fees.find(f => f.grade === newClass.grade); // Utilise grade au lieu de name
        newTuitionFee = feeForNewClass ? parseFloat(feeForNewClass.amount) : 0;
        form.setValue('tuitionFee', newTuitionFee, { shouldValidate: true });
    }

    const currentDiscount = watchedDiscountAmount || 0;
    const newAmountDue = Math.max(0, newTuitionFee - currentDiscount);
    form.setValue('amountDue', newAmountDue, { shouldValidate: true });

  }, [watchedClassId, watchedDiscountAmount, form, classes, fees, student.classId]);


  const handleEditStudent = async (values: StudentFormValues) => {
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
        cycle: selectedClassInfo?.cycle || student.cycle,
        dateOfBirth: values.dateOfBirth,
        tuitionFee: values.tuitionFee,
        discountAmount: values.discountAmount,
        discountReason: values.discountReason,
        amountDue: values.amountDue,
        tuitionStatus: values.tuitionStatus,
        status: values.status,
        feedback: values.feedback || '',
    };
    
    // 1. Update the student document
    batch.update(studentDocRef, updatedData);

    // 2. If the class has changed, update the counters
    if (classHasChanged) {
        // Decrement the old class counter if it existed
        if (oldClassId) {
            const oldClassRef = doc(firestore, `ecoles/${schoolId}/classes/${oldClassId}`);
            batch.update(oldClassRef, { studentCount: increment(-1) });
        }
        // Increment the new class counter
        const newClassRef = doc(firestore, `ecoles/${schoolId}/classes/${newClassId}`);
        batch.update(newClassRef, { studentCount: increment(1) });
    }

    batch.commit()
    .then(() => {
        toast({ title: "Élève modifié", description: `Les informations de ${values.firstName} ${values.lastName} ont été mises à jour. ${classHasChanged ? 'Les frais de scolarité ont été recalculés pour la nouvelle classe.' : ''}` });
        onFormSubmit();
    }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({ 
            path: `[BATCH] /ecoles/${schoolId}/eleves/${student.id}`, 
            operation: 'update', 
            requestResourceData: updatedData 
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleAnalyzeFeedback = async () => {
    const feedbackText = form.getValues('feedback');
    if (!feedbackText) {
      toast({ variant: 'destructive', title: "Aucun texte", description: "Le champ d'appréciation est vide." });
      return;
    }
    setIsAnalyzing(true);
    toast({ title: "Analyse IA non disponible", description: "La fonctionnalité d'analyse par IA a été temporairement désactivée." });
    setIsAnalyzing(false);
  };

  return (
    <Form {...form}>
      <form id={`edit-student-form-${student.id}`} onSubmit={form.handleSubmit(handleEditStudent)} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
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
        <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut Élève</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Actif">Actif</SelectItem><SelectItem value="En attente">En attente</SelectItem><SelectItem value="Radié">Radié</SelectItem></SelectContent></Select></FormItem>)} />
        
        <div className="p-4 border rounded-lg space-y-4 mt-4">
            <h4 className="font-medium text-sm">Gestion de la Scolarité</h4>
            <FormField control={form.control} name="tuitionFee" render={({ field }) => (<FormItem><FormLabel>Frais de scolarité (CFA)</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="discountAmount" render={({ field }) => (<FormItem><FormLabel>Remise (CFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="discountReason" render={({ field }) => (<FormItem><FormLabel>Motif de la remise</FormLabel><FormControl><Input placeholder="Ex: Bourse d'excellence" {...field} /></FormControl><FormMessage /></FormItem>)} />
             <FormField
                control={form.control}
                name="amountDue"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Solde dû (calculé)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} readOnly className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField control={form.control} name="tuitionStatus" render={({ field }) => (<FormItem><FormLabel>Statut Paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Soldé">Soldé</SelectItem><SelectItem value="En retard">En retard</SelectItem><SelectItem value="Partiel">Partiel</SelectItem></SelectContent></Select></FormItem>)} />
        </div>

        <FormField
          control={form.control}
          name="feedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Appréciation</FormLabel>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FormControl><Textarea {...field} /></FormControl>
                  <Button type="button" variant="outline" size="icon" onClick={handleAnalyzeFeedback} disabled={isAnalyzing}><Bot className="h-4 w-4" /></Button>
                </div>
              </div>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
