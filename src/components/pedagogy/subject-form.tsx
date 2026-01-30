'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { doc, addDoc, setDoc, collection } from 'firebase/firestore';
import type { subject as Subject } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const subjectSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  code: z.string().min(2, "Le code est requis.").max(10),
  color: z.string().optional(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface SubjectFormProps {
    schoolId: string;
    subject: (Subject & { id: string }) | null;
    onSave: () => void;
}

export function SubjectForm({ schoolId, subject, onSave }: SubjectFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SubjectFormValues>({
        resolver: zodResolver(subjectSchema),
    });

    useEffect(() => {
        form.reset(subject || { name: '', code: '', color: '#8B5CF6' });
    }, [subject, form]);
    
    const handleFormSubmit = async (values: SubjectFormValues) => {
        if (!schoolId) return;
        setIsSubmitting(true);

        const dataToSave = { ...values, schoolId };
        const promise = subject
            ? setDoc(doc(firestore, `ecoles/${schoolId}/matieres/${subject.id}`), dataToSave, { merge: true })
            : addDoc(collection(firestore, `ecoles/${schoolId}/matieres`), dataToSave);

        try {
            await promise;
            toast({ title: `Matière ${subject ? 'modifiée' : 'créée'}` });
            onSave();
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/matieres`, operation: 'write', requestResourceData: dataToSave }));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Form {...form}>
            <form id="subject-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom de la matière</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="color" render={({ field }) => (<FormItem><FormLabel>Couleur</FormLabel><FormControl><Input type="color" {...field} className="h-10" /></FormControl><FormMessage /></FormItem>)} />
              </div>
               <DialogFooter className="pt-4">
                    <Button variant="outline" type="button" onClick={onSave}>Annuler</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
