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
import type { occupant as Occupant, student as Student, room as Room } from '@/lib/data-types';
import { format, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { DialogFooter } from '../ui/dialog';

const occupantFormSchema = z.object({
  studentId: z.string().min(1, 'Veuillez sélectionner un élève.'),
  roomId: z.string().min(1, 'Veuillez sélectionner une chambre.'),
  startDate: z.string().min(1, 'La date de début est requise.'),
  endDate: z.string().optional(),
  status: z.enum(['active', 'pending', 'terminated', 'suspended']),
  nextPaymentDue: z.string().optional(),
});

type OccupantFormValues = z.infer<typeof occupantFormSchema>;

interface OccupantFormProps {
  schoolId: string;
  students: (Student & { id: string })[];
  rooms: (Room & { id: string })[];
  occupant: (Occupant & { id: string }) | null;
  onSave: () => void;
}

export function OccupantForm({ schoolId, students, rooms, occupant, onSave }: OccupantFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

  const form = useForm<OccupantFormValues>({
    resolver: zodResolver(occupantFormSchema),
    defaultValues: occupant ? {
      ...occupant,
      startDate: format(new Date(occupant.startDate), 'yyyy-MM-dd'),
      endDate: occupant.endDate ? format(new Date(occupant.endDate), 'yyyy-MM-dd') : '',
      nextPaymentDue: occupant.nextPaymentDue ? format(new Date(occupant.nextPaymentDue), 'yyyy-MM-dd') : '',
    } : {
      studentId: '',
      roomId: '',
      startDate: today,
      endDate: '',
      status: 'active',
      nextPaymentDue: nextMonth,
    },
  });
  
  const availableRooms = useMemo(() => rooms.filter(room => room.status === 'available' || room.id === occupant?.roomId), [rooms, occupant]);

  useEffect(() => {
    form.reset(occupant ? {
      ...occupant,
      startDate: format(new Date(occupant.startDate), 'yyyy-MM-dd'),
      endDate: occupant.endDate ? format(new Date(occupant.endDate), 'yyyy-MM-dd') : '',
      nextPaymentDue: occupant.nextPaymentDue ? format(new Date(occupant.nextPaymentDue), 'yyyy-MM-dd') : '',
    } : {
      studentId: '',
      roomId: '',
      startDate: today,
      endDate: '',
      status: 'active',
      nextPaymentDue: nextMonth,
    });
  }, [occupant, today, nextMonth, form]);

  const handleSubmit = async (values: OccupantFormValues) => {
    setIsSubmitting(true);
    
    const dataToSave = { ...values };

    const promise = occupant && occupant.id
        ? setDoc(doc(firestore, `ecoles/${schoolId}/internat_occupants/${occupant.id}`), dataToSave, { merge: true })
        : addDoc(collection(firestore, `ecoles/${schoolId}/internat_occupants`), dataToSave);
    
    promise.then(() => {
        toast({ title: 'Occupation enregistrée', description: "L'assignation de la chambre a été enregistrée." });
        onSave();
    }).catch(e => {
        const path = `ecoles/${schoolId}/internat_occupants/${occupant?.id || '(new)'}`;
        const operation = occupant ? 'update' : 'create';
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
            <FormField control={form.control} name="studentId" render={({ field }) => (
                <FormItem><FormLabel>Élève</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!!occupant}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger></FormControl><SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id!}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="roomId" render={({ field }) => (
                <FormItem><FormLabel>Chambre</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une chambre disponible" /></SelectTrigger></FormControl><SelectContent>{availableRooms.map(r => <SelectItem key={r.id} value={r.id}>{r.number}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Date d'entrée</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem><FormLabel>Date de sortie (optionnel)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
             <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="pending">En attente</SelectItem><SelectItem value="suspended">Suspendu</SelectItem><SelectItem value="terminated">Terminé</SelectItem></SelectContent></Select></FormItem>)} />
            <FormField control={form.control} name="nextPaymentDue" render={({ field }) => (<FormItem><FormLabel>Prochain paiement dû</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
