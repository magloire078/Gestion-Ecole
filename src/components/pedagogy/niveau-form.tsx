'use client';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, addDoc, setDoc, collection } from 'firebase/firestore';
import type { cycle as Cycle, niveau as Niveau } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useState, useEffect, useMemo } from 'react';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import { Loader2 } from 'lucide-react';


const niveauSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  code: z.string().min(1, "Le code est requis.").max(10),
  order: z.coerce.number().min(1, "L'ordre est requis."),
  cycleId: z.string().min(1, 'Le cycle est requis.'),
  capacity: z.coerce.number().min(1, 'La capacité est requise.'),
  ageMin: z.coerce.number().optional(),
  ageMax: z.coerce.number().optional(),
});
type NiveauFormValues = z.infer<typeof niveauSchema>;

interface NiveauFormProps {
    schoolId: string;
    cycles: (Cycle & {id: string})[];
    niveaux: (Niveau & {id: string})[];
    niveau: (Niveau & { id: string }) | null;
    defaultCycleId?: string;
    onSave: () => void;
}

export function NiveauForm({ schoolId, cycles, niveaux, niveau, defaultCycleId, onSave }: NiveauFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NiveauFormValues>({
    resolver: zodResolver(niveauSchema),
  });

  useEffect(() => {
    form.reset(niveau || { 
        name: '', 
        code: '', 
        order: (niveaux.length || 0) + 1, 
        cycleId: defaultCycleId || (cycles.length > 0 ? cycles[0].id : ''), 
        capacity: 30 
    });
  }, [niveau, defaultCycleId, cycles, niveaux, form]);

  const watchedCycleId = useWatch({ control: form.control, name: 'cycleId' });
  const watchedNiveauName = useWatch({ control: form.control, name: 'name' });
  
  const niveauxOptions = useMemo(() => {
    const cycle = cycles.find(c => c.id === watchedCycleId);
    if (!cycle) return [];
    return SCHOOL_TEMPLATES.IVORIAN_SYSTEM.niveaux[cycle.name as keyof typeof SCHOOL_TEMPLATES.IVORIAN_SYSTEM.niveaux] || [];
  }, [watchedCycleId, cycles]);

  useEffect(() => {
    const selectedNiveauTemplate = niveauxOptions.find(n => n === watchedNiveauName);
    if(selectedNiveauTemplate) {
      form.setValue('code', selectedNiveauTemplate.replace(/\s+/g, '').toUpperCase());
    }
  }, [watchedNiveauName, niveauxOptions, form]);


  const handleFormSubmit = async (values: NiveauFormValues) => {
    setIsSubmitting(true);
    const dataToSave = { ...values, schoolId };

    const promise = niveau
      ? setDoc(doc(firestore, `ecoles/${schoolId}/niveaux/${niveau.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/niveaux`), dataToSave);
    
    try {
      await promise;
      toast({ title: `Niveau ${niveau ? 'modifié' : 'créé'}` });
      onSave();
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ 
          path: `ecoles/${schoolId}/niveaux`, 
          operation: 'write', 
          requestResourceData: dataToSave 
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="max-h-[60vh] overflow-y-auto p-1 pr-4 space-y-4">
          <FormField control={form.control} name="cycleId" render={({ field }) => (<FormItem><FormLabel>Cycle *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger></FormControl><SelectContent>{cycles.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du niveau *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedCycleId}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger></FormControl><SelectContent>{niveauxOptions.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="order" render={({ field }) => (<FormItem><FormLabel>Ordre</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacité max.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
