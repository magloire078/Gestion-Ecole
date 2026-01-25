
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { materiel as Materiel } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { format } from 'date-fns';
import { Combobox } from '../ui/combobox';
import { Loader2 } from 'lucide-react';

const materielSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  category: z.enum(["Mobilier", "Informatique", "Pédagogique", "Sportif", "Autre"]),
  quantity: z.coerce.number().min(1, "La quantité doit être au moins de 1."),
  status: z.enum(["neuf", "bon", "à réparer", "hors_service"]),
  locationId: z.string().min(1, "L'emplacement est requis."),
  acquisitionDate: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
});

type MaterielFormValues = z.infer<typeof materielSchema>;

interface MaterielFormProps {
    schoolId: string;
    materiel: (Materiel & { id: string }) | null;
    locationOptions: { value: string, label: string }[];
    onSave: () => void;
}

export function MaterielForm({ schoolId, materiel, locationOptions, onSave }: MaterielFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MaterielFormValues>({
    resolver: zodResolver(materielSchema),
  });

  useEffect(() => {
    form.reset(
      materiel 
        ? { ...materiel, acquisitionDate: materiel.acquisitionDate ? format(new Date(materiel.acquisitionDate), 'yyyy-MM-dd') : '' }
        : { category: "Mobilier", status: "bon", quantity: 1, locationId: '', name: '', acquisitionDate: format(new Date(), 'yyyy-MM-dd') }
    );
  }, [materiel, form]);

  const handleFormSubmit = async (values: MaterielFormValues) => {
    if (!schoolId) return;
    setIsSubmitting(true);
    const dataToSave = { ...values, schoolId };

    const promise = materiel
        ? setDoc(doc(firestore, `ecoles/${schoolId}/inventaire`, materiel.id), dataToSave, { merge: true })
        : addDoc(collection(firestore, `ecoles/${schoolId}/inventaire`), dataToSave);
    try {
        await promise;
        toast({ title: `Matériel ${materiel ? 'modifié' : 'ajouté'}`, description: `L'équipement ${values.name} a été enregistré.` });
        onSave();
    } catch (e) {
        const path = `ecoles/${schoolId}/inventaire/${materiel?.id || '(new)'}`;
        const operation = materiel ? 'update' : 'create';
        const permissionError = new FirestorePermissionError({ path, operation, requestResourceData: dataToSave });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
        <form id="materiel-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Nom de l'équipement</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="category" render={({ field }) => <FormItem><FormLabel>Catégorie</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Mobilier">Mobilier</SelectItem><SelectItem value="Informatique">Informatique</SelectItem><SelectItem value="Pédagogique">Pédagogique</SelectItem><SelectItem value="Sportif">Sportif</SelectItem><SelectItem value="Autre">Autre</SelectItem></SelectContent></Select></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="quantity" render={({ field }) => <FormItem><FormLabel>Quantité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="neuf">Neuf</SelectItem><SelectItem value="bon">Bon</SelectItem><SelectItem value="à réparer">À réparer</SelectItem><SelectItem value="hors_service">Hors service</SelectItem></SelectContent></Select></FormItem>} />
                </div>
                <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Emplacement</FormLabel>
                        <FormControl>
                        <Combobox
                            placeholder="Choisir un emplacement"
                            searchPlaceholder="Chercher un lieu..."
                            options={locationOptions}
                            value={field.value || ''}
                            onValueChange={field.onChange}
                            onCreate={(value) => {
                                field.onChange(value);
                                toast({title: `Emplacement "${value}" sera sauvegardé tel quel.`})
                                return Promise.resolve({ value, label: value });
                            }}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField control={form.control} name="acquisitionDate" render={({ field }) => <FormItem><FormLabel>Date d'acquisition</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>} />
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
  )
}
