
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
import type { room as Room, building as Building } from '@/lib/data-types';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { DialogFooter } from '../ui/dialog';

const roomFormSchema = z.object({
  buildingId: z.string().min(1, 'Le bâtiment est requis.'),
  number: z.string().min(1, 'Le numéro de chambre est requis.'),
  capacity: z.coerce.number().min(1, 'La capacité doit être au moins de 1.'),
  status: z.enum(['available', 'occupied', 'maintenance']),
  monthlyRate: z.coerce.number().min(0, 'Le tarif doit être un nombre positif.'),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

interface RoomFormProps {
  schoolId: string;
  buildings: (Building & { id: string })[];
  room: (Room & { id: string }) | null;
  onSave: () => void;
}

export function RoomForm({ schoolId, buildings, room, onSave }: RoomFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: room ? {
      ...room,
      capacity: room.capacity || 1,
      monthlyRate: room.monthlyRate || 0,
    } : {
      buildingId: '',
      number: '',
      capacity: 4,
      status: 'available',
      monthlyRate: 0,
    },
  });

   useEffect(() => {
    form.reset(room ? {
      ...room,
      capacity: room.capacity || 1,
      monthlyRate: room.monthlyRate || 0,
    } : {
      buildingId: buildings.length > 0 ? buildings[0].id : '',
      number: '',
      capacity: 4,
      status: 'available',
      monthlyRate: 0,
    });
  }, [room, buildings, form]);

  const handleSubmit = async (values: RoomFormValues) => {
    setIsSubmitting(true);
    
    const dataToSave = {
        ...values,
    };

    const promise = room && room.id
        ? setDoc(doc(firestore, `ecoles/${schoolId}/internat_chambres/${room.id}`), dataToSave, { merge: true })
        : addDoc(collection(firestore, `ecoles/${schoolId}/internat_chambres`), dataToSave);
    
    promise.then(() => {
        toast({ title: 'Chambre enregistrée', description: `La chambre ${values.number} a été enregistrée.` });
        onSave();
    }).catch(e => {
        const path = `ecoles/${schoolId}/internat_chambres/${room?.id || '(new)'}`;
        const operation = room ? 'update' : 'create';
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
            <FormField control={form.control} name="number" render={({ field }) => (<FormItem><FormLabel>Numéro de la chambre</FormLabel><FormControl><Input placeholder="Ex: 101-A" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacité</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="available">Disponible</SelectItem><SelectItem value="occupied">Occupée</SelectItem><SelectItem value="maintenance">En maintenance</SelectItem></SelectContent></Select></FormItem>)} />
            </div>
            <FormField control={form.control} name="monthlyRate" render={({ field }) => (<FormItem><FormLabel>Tarif Mensuel (CFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
