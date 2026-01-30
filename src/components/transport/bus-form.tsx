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
import type { bus as Bus, staff as Staff } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { DialogFooter } from '../ui/dialog';

const busSchema = z.object({
  registrationNumber: z.string().min(1, "L'immatriculation est requise."),
  capacity: z.coerce.number().min(1, "La capacité est requise."),
  type: z.enum(['standard', 'minibus', 'adapted']),
  driverId: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'inactive']),
});

type BusFormValues = z.infer<typeof busSchema>;

interface BusFormProps {
    schoolId: string;
    drivers: (Staff & { id: string })[];
    bus: (Bus & { id: string }) | null;
    onSave: () => void;
}

export function BusForm({ schoolId, drivers, bus, onSave }: BusFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<BusFormValues>({
        resolver: zodResolver(busSchema),
    });
    const { reset } = form;

    useEffect(() => {
        reset(bus ? { ...bus, driverId: bus.driverId || '' } : { registrationNumber: '', type: 'standard', status: 'active', capacity: 50, driverId: '' });
    }, [bus, reset]);


    const handleFormSubmit = async (values: BusFormValues) => {
        setIsSubmitting(true);
        const dataToSave = { ...values };

        const promise = bus
            ? setDoc(doc(firestore, `ecoles/${schoolId}/transport_bus/${bus.id}`), dataToSave, { merge: true })
            : addDoc(collection(firestore, `ecoles/${schoolId}/transport_bus`), dataToSave);

        try {
            await promise;
            toast({ title: `Bus ${bus ? 'modifié' : 'ajouté'}`, description: `Le bus ${values.registrationNumber} a été enregistré.` });
            onSave();
        } catch (error) {
            console.error("Error saving bus:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer le bus.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form id="bus-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField control={form.control} name="registrationNumber" render={({ field }) => <FormItem><FormLabel>Immatriculation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="capacity" render={({ field }) => <FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="type" render={({ field }) => <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="minibus">Minibus</SelectItem><SelectItem value="adapted">Adapté</SelectItem></SelectContent></Select></FormItem>} />
              </div>
              <FormField control={form.control} name="driverId" render={({ field }) => <FormItem><FormLabel>Chauffeur</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Assigner un chauffeur"/></SelectTrigger></FormControl><SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>)}</SelectContent></Select></FormItem>} />
              <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="maintenance">En maintenance</SelectItem><SelectItem value="inactive">Inactif</SelectItem></SelectContent></Select></FormItem>} />
            </form>
            <DialogFooter className="pt-4">
                <Button variant="outline" onClick={onSave}>Annuler</Button>
                <Button type="submit" form="bus-form" disabled={form.formState.isSubmitting}>
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
            </DialogFooter>
        </Form>
    );
}
