
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { salle as Salle, building as Building } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { DialogFooter } from '../ui/dialog';

const salleFormSchema = z.object({
  buildingId: z.string().min(1, 'Le bâtiment est requis.'),
  name: z.string().min(1, 'Le nom de la salle est requis.'),
  type: z.enum(['salle_de_classe', 'salle_de_reunion', 'laboratoire', 'amphitheatre', 'gymnase']),
  capacity: z.coerce.number().min(1, 'La capacité doit être d\'au moins 1.'),
});

type SalleFormValues = z.infer<typeof salleFormSchema>;

interface SalleFormProps {
  schoolId: string;
  buildings: (Building & { id: string })[];
  salle: (Salle & { id: string }) | null;
  onSave: () => void;
}

export function SalleForm({ schoolId, buildings, salle, onSave }: SalleFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SalleFormValues>({
    resolver: zodResolver(salleFormSchema),
  });

  useEffect(() => {
    form.reset(salle || {
      buildingId: buildings.length > 0 ? buildings[0].id : '',
      name: '',
      type: 'salle_de_classe',
      capacity: 30,
    });
  }, [salle, buildings, form]);

  const handleSubmit = async (values: SalleFormValues) => {
    setIsSubmitting(true);
    
    const dataToSave = { ...values };

    const promise = salle && salle.id
        ? setDoc(doc(firestore, `ecoles/${schoolId}/salles/${salle.id}`), dataToSave, { merge: true })
        : addDoc(collection(firestore, `ecoles/${schoolId}/salles`), dataToSave);
    
    promise.then(() => {
        toast({ title: 'Salle enregistrée', description: `La salle ${values.name} a été enregistrée.` });
        onSave();
    }).catch(e => {
        const path = `ecoles/${schoolId}/salles/${salle?.id || '(new)'}`;
        const operation = salle ? 'update' : 'create';
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
            <FormField control={form.control} name="buildingId" render={({ field }) => (
                <FormItem><FormLabel>Bâtiment</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un bâtiment" /></SelectTrigger></FormControl><SelectContent>{buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom / Numéro de la salle</FormLabel><FormControl><Input placeholder="Ex: Salle 101, Amphithéâtre A" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="salle_de_classe">Salle de classe</SelectItem><SelectItem value="salle_de_reunion">Salle de réunion</SelectItem><SelectItem value="laboratoire">Laboratoire</SelectItem><SelectItem value="amphitheatre">Amphithéâtre</SelectItem><SelectItem value="gymnase">Gymnase</SelectItem></SelectContent></Select></FormItem>)} />
              <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
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
