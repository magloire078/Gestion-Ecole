'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { student as Student } from '@/lib/data-types';
import { useEffect } from 'react';

const absenceSchema = z.object({
  date: z.string().min(1, { message: "La date est requise." }),
  type: z.enum(["Journée entière", "Matin", "Après-midi"], { required_error: "Le type d'absence est requis." }),
  justified: z.boolean().default(false),
  reason: z.string().optional(),
});
type AbsenceFormValues = z.infer<typeof absenceSchema>;

interface AbsenceFormProps {
    schoolId: string;
    student: Student | null;
    onSave: () => void;
}

export function AbsenceForm({ schoolId, student, onSave }: AbsenceFormProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();

    const form = useForm<AbsenceFormValues>({
        resolver: zodResolver(absenceSchema),
        defaultValues: {
            date: '',
            type: "Journée entière",
            justified: false,
            reason: "",
        }
    });
    const { setValue } = form;

    useEffect(() => {
        // Set date only on client to avoid hydration mismatch
        setValue('date', new Date().toISOString().split('T')[0]);
    }, [setValue]);

    const handleFormSubmit = async (values: AbsenceFormValues) => {
        if (!schoolId || !user || !student || !student.id) return;

        const absenceData = {
          ...values,
          schoolId,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          classId: student.classId,
          recordedBy: user.uid,
          createdAt: serverTimestamp(),
        };
        
        const absenceCollectionRef = collection(firestore, `ecoles/${schoolId}/eleves/${student.id}/absences`);
        try {
            await addDoc(absenceCollectionRef, absenceData);
            toast({
                title: "Absence enregistrée",
                description: `L'absence de ${student.firstName} a été enregistrée.`,
            });
            onSave();
        } catch (error) {
            console.error("Error saving absence: ", error);
            toast({
                variant: 'destructive',
                title: "Erreur d'enregistrement",
                description: "Impossible d'enregistrer l'absence. Veuillez vérifier vos permissions et réessayer.",
            });
        }
    };

    return (
        <Form {...form}>
            <form id="absence-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
              <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'absence</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Journée entière" id="t1" /></FormControl><FormLabel htmlFor="t1" className="font-normal">Journée</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Matin" id="t2" /></FormControl><FormLabel htmlFor="t2" className="font-normal">Matin</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Après-midi" id="t3" /></FormControl><FormLabel htmlFor="t3" className="font-normal">Après-midi</FormLabel></FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="justified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel>Absence justifiée</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Motif (si justifiée)</FormLabel><FormControl><Input placeholder="Ex: Rendez-vous médical" {...field} /></FormControl></FormItem>)} />
            
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        <span className="flex items-center gap-2">{form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</span>
                    </Button>
                </DialogFooter>
            </form>
          </Form>
    );
}
