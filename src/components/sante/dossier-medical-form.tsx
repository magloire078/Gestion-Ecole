
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { dossierMedical as DossierMedical } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const dossierMedicalSchema = z.object({
  groupeSanguin: z.string().optional(),
  allergies: z.string().optional(),
  maladiesChroniques: z.string().optional(),
  urgences: z.object({
    contact1: z.string().optional(),
    assurance: z.string().optional(),
    numeroPolice: z.string().optional(),
  }).optional(),
});

type DossierFormValues = z.infer<typeof dossierMedicalSchema>;

interface DossierMedicalFormProps {
  schoolId: string;
  studentId: string;
  dossier: DossierMedical | null;
  onSave: () => void;
}

export function DossierMedicalForm({ schoolId, studentId, dossier, onSave }: DossierMedicalFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DossierFormValues>({
    resolver: zodResolver(dossierMedicalSchema),
  });
  
  useEffect(() => {
    form.reset({
      groupeSanguin: dossier?.groupeSanguin || '',
      allergies: (dossier?.allergies || []).join(', '),
      maladiesChroniques: (dossier?.maladiesChroniques || []).join(', '),
      urgences: {
        contact1: dossier?.urgences?.contact1 || '',
        assurance: dossier?.urgences?.assurance || '',
        numeroPolice: dossier?.urgences?.numeroPolice || '',
      },
    });
  }, [dossier, form]);

  const handleSubmit = async (values: DossierFormValues) => {
    setIsSubmitting(true);
    const dossierRef = doc(firestore, `ecoles/${schoolId}/eleves/${studentId}/dossier_medical/${studentId}`);

    const dataToSave = {
        studentId,
        ...values,
        allergies: values.allergies ? values.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        maladiesChroniques: values.maladiesChroniques ? values.maladiesChroniques.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    
    try {
      await setDoc(dossierRef, dataToSave, { merge: true });
      toast({ title: 'Dossier médical mis à jour', description: 'Les informations ont été enregistrées avec succès.' });
      onSave();
    } catch (e) {
      const permissionError = new FirestorePermissionError({
        path: dossierRef.path,
        operation: 'write',
        requestResourceData: dataToSave,
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
        <FormField control={form.control} name="groupeSanguin" render={({ field }) => <FormItem><FormLabel>Groupe Sanguin</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="allergies" render={({ field }) => <FormItem><FormLabel>Allergies (séparées par une virgule)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="maladiesChroniques" render={({ field }) => <FormItem><FormLabel>Maladies chroniques (séparées par une virgule)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        
        <h4 className="font-semibold text-md pt-2 border-t">Contacts d'Urgence</h4>
        <FormField control={form.control} name="urgences.contact1" render={({ field }) => <FormItem><FormLabel>Contact principal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="urgences.assurance" render={({ field }) => <FormItem><FormLabel>Assurance</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="urgences.numeroPolice" render={({ field }) => <FormItem><FormLabel>Numéro de Police d'Assurance</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
