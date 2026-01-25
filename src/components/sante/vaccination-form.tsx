
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';

const vaccinationSchema = z.object({
  nom: z.string().min(1, "Le nom du vaccin est requis."),
  date: z.string().min(1, "La date est requise."),
  rappel: z.string().optional(),
});

type VaccinationFormValues = z.infer<typeof vaccinationSchema>;

interface VaccinationFormProps {
  schoolId: string;
  studentId: string;
  onSave: () => void;
}

export function VaccinationForm({ schoolId, studentId, onSave }: VaccinationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VaccinationFormValues>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: {
      nom: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      rappel: '',
    },
  });

  const handleSubmit = async (values: VaccinationFormValues) => {
    setIsSubmitting(true);
    const vaccinsRef = collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/dossier_medical/${studentId}/vaccins`);
    const dataToSave = { ...values, schoolId };

    addDoc(vaccinsRef, dataToSave).then(() => {
        toast({ title: 'Vaccin ajouté', description: `Le vaccin ${values.nom} a été enregistré.` });
        onSave();
    }).catch(e => {
        const permissionError = new FirestorePermissionError({
            path: vaccinsRef.path,
            operation: 'create',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="nom" render={({ field }) => <FormItem><FormLabel>Nom du Vaccin</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => <FormItem><FormLabel>Date de vaccination</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="rappel" render={({ field }) => <FormItem><FormLabel>Date de rappel (optionnel)</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>} />
        </div>
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
