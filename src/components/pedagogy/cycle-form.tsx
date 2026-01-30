'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, addDoc, setDoc, collection } from 'firebase/firestore';
import type { cycle as Cycle } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useState, useEffect } from 'react';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

const cycleSchema = z.object({
  name: z.string().min(2, "Le nom est requis."),
  code: z.string().min(2, "Le code est requis.").max(5, "Le code ne peut excéder 5 caractères."),
  order: z.coerce.number().min(1, "L'ordre est requis."),
  isActive: z.boolean().default(true),
  color: z.string().optional(),
});
type CycleFormValues = z.infer<typeof cycleSchema>;

interface CycleFormProps {
    schoolId: string;
    cycle: (Cycle & { id: string }) | null;
    cyclesCount: number;
    onSave: () => void;
}

const ivorianCycles = SCHOOL_TEMPLATES.IVORIAN_SYSTEM.cycles;

export function CycleForm({ schoolId, cycle, cyclesCount, onSave }: CycleFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<CycleFormValues>({
        resolver: zodResolver(cycleSchema),
        defaultValues: cycle || { name: '', code: '', order: cyclesCount + 1, isActive: true, color: '#3b82f6' }
    });
    const { setValue } = form;

    const watchedCycleName = useWatch({ control: form.control, name: 'name' });
  
    useEffect(() => {
        const selectedCycleTemplate = ivorianCycles.find(c => c.name === watchedCycleName);
        if (selectedCycleTemplate && !cycle) { // Don't auto-fill when editing
            setValue('code', selectedCycleTemplate.code);
            setValue('order', selectedCycleTemplate.order);
        }
    }, [watchedCycleName, cycle, setValue]);

    const handleFormSubmit = (values: CycleFormValues) => {
        if (!schoolId) return;
        setIsSubmitting(true);
        const dataToSave = { ...values, schoolId };
        const collectionRef = collection(firestore, `ecoles/${schoolId}/cycles`);
        const promise = cycle
          ? setDoc(doc(collectionRef, cycle.id), dataToSave, { merge: true })
          : addDoc(collectionRef, dataToSave);
        
        promise.then(() => {
          toast({ title: `Cycle ${cycle ? 'modifié' : 'créé'}` });
          onSave();
        }).catch(error => {
          const path = `ecoles/${schoolId}/cycles/${cycle?.id || ''}`;
          const operation = cycle ? 'update' : 'create';
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation, requestResourceData: dataToSave }));
        }).finally(() => {
            setIsSubmitting(false);
        });
    };

    return (
        <Form {...form}>
            <form id="cycle-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nom du cycle</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un type..." /></SelectTrigger></FormControl><SelectContent>{ivorianCycles.map((cycle) => (<SelectItem key={cycle.name} value={cycle.name}>{cycle.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="color" render={({ field }) => (<FormItem><FormLabel>Couleur</FormLabel><FormControl><Input type="color" {...field} className="h-10" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="isActive" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Actif</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
              <DialogFooter>
                  <Button variant="outline" type="button" onClick={onSave}>Annuler</Button>
                  <Button type="submit" disabled={isSubmitting}>Enregistrer</Button>
              </DialogFooter>
            </form>
          </Form>
    );
}
