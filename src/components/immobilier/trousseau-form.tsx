'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import type { key_trousseau as KeyTrousseau } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useSchoolData } from '@/hooks/use-school-data';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Label } from '../ui/label';

const keyTrousseauSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  description: z.string().optional(),
  keys: z.array(z.object({ value: z.string().min(1, "L'identifiant de la clé est requis.") })).optional(),
});

type KeyTrousseauFormValues = z.infer<typeof keyTrousseauSchema>;

interface TrousseauFormProps {
  schoolId: string;
  trousseau: (KeyTrousseau & { id: string }) | null;
  onSave: () => void;
}

export function TrousseauForm({ schoolId, trousseau: editingTrousseau, onSave }: TrousseauFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<KeyTrousseauFormValues>({
    resolver: zodResolver(keyTrousseauSchema),
    defaultValues: { name: '', description: '', keys: [{ value: 'cle-1' }] },
  });
  const { reset } = form;

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'keys' });
  
  useEffect(() => {
    reset(editingTrousseau ? { ...editingTrousseau, keys: editingTrousseau.keys?.map(k => ({value: k})) } : { name: '', description: '', keys: [{ value: 'cle-1' }] });
  }, [editingTrousseau, reset]);


  const handleFormSubmit = async (values: KeyTrousseauFormValues) => {
    if (!schoolId) return;
    setIsSubmitting(true);

    const keysArray = values.keys ? values.keys.map(k => k.value).filter(Boolean) : [];
    const dataToSave: Partial<KeyTrousseau> = { 
        ...values, 
        keys: keysArray 
    };
    if (!editingTrousseau) {
      dataToSave.status = 'disponible';
    }

    const promise = editingTrousseau
      ? setDoc(doc(firestore, `ecoles/${schoolId}/cles_trousseaux/${editingTrousseau.id}`), dataToSave, { merge: true })
      : addDoc(collection(firestore, `ecoles/${schoolId}/cles_trousseaux`), dataToSave);

    try {
      await promise;
      toast({ title: `Trousseau ${editingTrousseau ? 'modifié' : 'ajouté'}` });
      onSave();
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/cles_trousseaux`, operation: 'write', requestResourceData: dataToSave }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form id="trousseau-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
        <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>} />
        <div>
          <Label>Clés incluses</Label>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-center mt-2">
              <FormField control={form.control} name={`keys.${index}.value`} render={({ field }) => <FormItem className="flex-1"><FormControl><Input placeholder={`ID Clé ${index + 1}`} {...field} /></FormControl></FormItem>} />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => append({ value: '' })}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter une clé</Button>
        </div>
         <DialogFooter>
            <Button variant="outline" onClick={onSave} type="button">Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
