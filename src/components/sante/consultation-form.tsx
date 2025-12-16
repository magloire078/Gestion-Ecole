
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';

const consultationSchema = z.object({
  date: z.string().min(1, "La date est requise."),
  motif: z.string().min(1, "Le motif est requis."),
  diagnostic: z.string().min(1, "Le diagnostic est requis."),
  traitement: z.string().optional(),
  medecin: z.string().optional(),
});

type ConsultationFormValues = z.infer<typeof consultationSchema>;

interface ConsultationFormProps {
  schoolId: string;
  studentId: string;
  onSave: () => void;
}

export function ConsultationForm({ schoolId, studentId, onSave }: ConsultationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      motif: '',
      diagnostic: '',
      traitement: '',
      medecin: '',
    },
  });

  const handleSubmit = async (values: ConsultationFormValues) => {
    setIsSubmitting(true);
    const consultationRef = collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/dossier_medical/${studentId}/consultations`);

    try {
      await addDoc(consultationRef, values);
      toast({ title: 'Consultation ajoutée', description: 'La consultation a été enregistrée avec succès.' });
      onSave();
    } catch (e) {
        const permissionError = new FirestorePermissionError({
            path: consultationRef.path,
            operation: 'create',
            requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="date" render={({ field }) => <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="motif" render={({ field }) => <FormItem><FormLabel>Motif</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="diagnostic" render={({ field }) => <FormItem><FormLabel>Diagnostic</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="traitement" render={({ field }) => <FormItem><FormLabel>Traitement</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
        <FormField control={form.control} name="medecin" render={({ field }) => <FormItem><FormLabel>Médecin</FormLabel><FormControl><Input placeholder="Dr. Dupont" {...field} /></FormControl></FormItem>} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
