
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { building as Building, staff as Staff } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { useSchoolData } from '@/hooks/use-school-data';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { DialogFooter } from '../ui/dialog';
import { query } from 'firebase/firestore';

const buildingSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  type: z.enum(['garcons', 'filles', 'mixte', 'administratif', 'pedagogique', 'sportif', 'autre']),
  capacity: z.coerce.number().min(1, "La capacité est requise."),
  responsableId: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'full']),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

interface BuildingFormProps {
  building: (Building & { id: string }) | null;
  onSave: () => void;
  collectionName: string;
}

export function BuildingForm({ building, onSave, collectionName }: BuildingFormProps) {
  const { schoolId } = useSchoolData();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const staffQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData } = useCollection(staffQuery);
  const staffMembers = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as Staff & {id: string})) || [], [staffData]);

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
  });

  useEffect(() => {
    form.reset(building || { type: "mixte", status: 'active', name: '', capacity: 0, responsableId: '' });
  }, [building, form]);

  const handleFormSubmit = async (values: BuildingFormValues) => {
    if (!schoolId) return;
    setIsSubmitting(true);
    const dataToSave = { ...values, schoolId };

    const collectionRef = collection(firestore, `ecoles/${schoolId}/${collectionName}`);
    const promise = building
      ? setDoc(doc(collectionRef, building.id), dataToSave, { merge: true })
      : addDoc(collectionRef, dataToSave);
      
    promise
        .then(() => {
            toast({ title: `Bâtiment ${building ? 'modifié' : 'ajouté'}`, description: `Le bâtiment ${values.name} a été enregistré.` });
            onSave();
        })
        .catch(e => {
          const path = `ecoles/${schoolId}/${collectionName}/${building?.id || '(new)'}`;
          const operation = building ? 'update' : 'create';
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation, requestResourceData: dataToSave }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  const buildingTypes = collectionName === 'internat_batiments' 
    ? [{value: 'garcons', label: 'Garçons'}, {value: 'filles', label: 'Filles'}, {value: 'mixte', label: 'Mixte'}]
    : [{value: 'administratif', label: 'Administratif'}, {value: 'pedagogique', label: 'Pédagogique'}, {value: 'sportif', label: 'Sportif'}, {value: 'autre', label: 'Autre'}];

  return (
    <Form {...form}>
      <form id="building-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom du Bâtiment</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{buildingTypes.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></FormItem>} />
        <FormField control={form.control} name="capacity" render={({ field }) => <FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
        <FormField control={form.control} name="responsableId" render={({ field }) => <FormItem><FormLabel>Responsable</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir..."/></SelectTrigger></FormControl><SelectContent>{staffMembers.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
        <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="maintenance">En maintenance</SelectItem><SelectItem value="full">Plein</SelectItem></SelectContent></Select></FormItem>} />
        <DialogFooter>
            <Button variant="outline" onClick={onSave}>Annuler</Button>
            <Button type="submit" form="building-form" disabled={isSubmitting}>Enregistrer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
