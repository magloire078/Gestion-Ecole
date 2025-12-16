
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { reservation_salle as Reservation, salle as Salle, staff as Staff } from '@/lib/data-types';
import { format, set } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { DialogFooter } from '../ui/dialog';

const timeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)");

const reservationFormSchema = z.object({
  salleId: z.string().min(1, 'Veuillez sélectionner une salle.'),
  eventName: z.string().min(1, "L'intitulé de l'événement est requis."),
  date: z.string().min(1, 'La date est requise.'),
  startTime: timeSchema,
  endTime: timeSchema,
  status: z.enum(['confirmée', 'en_attente', 'annulée']),
  notes: z.string().optional(),
}).refine(data => data.endTime > data.startTime, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["endTime"],
});

type ReservationFormValues = z.infer<typeof reservationFormSchema>;

interface ReservationFormProps {
  schoolId: string;
  salles: (Salle & { id: string })[];
  staff: Staff[];
  reservation: (Reservation & { id: string }) | null;
  preselectedSlot: { time: string, date: Date, salleId: string } | null;
  onSave: () => void;
}

export function ReservationForm({ schoolId, salles, staff, reservation, preselectedSlot, onSave }: ReservationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
  });

  useEffect(() => {
    if (reservation) {
      form.reset({
        ...reservation,
        date: format(new Date(reservation.startTime), 'yyyy-MM-dd'),
        startTime: format(new Date(reservation.startTime), 'HH:mm'),
        endTime: format(new Date(reservation.endTime), 'HH:mm'),
      });
    } else if (preselectedSlot) {
        const start = set(preselectedSlot.date, { hours: parseInt(preselectedSlot.time.split(':')[0]), minutes: 0 });
        const end = set(start, { hours: start.getHours() + 1 });
        form.reset({
            salleId: preselectedSlot.salleId,
            date: format(preselectedSlot.date, 'yyyy-MM-dd'),
            startTime: format(start, 'HH:mm'),
            endTime: format(end, 'HH:mm'),
            status: 'confirmée',
            eventName: '',
            notes: '',
        });
    } else {
        form.reset({
            date: format(new Date(), 'yyyy-MM-dd'),
            startTime: '08:00',
            endTime: '09:00',
            status: 'confirmée',
        });
    }
  }, [reservation, preselectedSlot, form]);
  

  const handleSubmit = async (values: ReservationFormValues) => {
    if (!user || !user.authUser) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non trouvé.'});
        return;
    }
    setIsSubmitting(true);
    
    const startDateTime = new Date(`${values.date}T${values.startTime}`);
    const endDateTime = new Date(`${values.date}T${values.endTime}`);

    const dataToSave = {
        salleId: values.salleId,
        eventName: values.eventName,
        reservedBy: user.authUser.uid,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        status: values.status,
        notes: values.notes || '',
    };
    
    const promise = reservation
        ? setDoc(doc(firestore, `ecoles/${schoolId}/reservations_salles/${reservation.id}`), dataToSave, { merge: true })
        : addDoc(collection(firestore, `ecoles/${schoolId}/reservations_salles`), dataToSave);

    promise.then(() => {
        toast({ title: 'Réservation enregistrée', description: 'La réservation a été enregistrée avec succès.' });
        onSave();
    }).catch(e => {
        const path = `ecoles/${schoolId}/reservations_salles/${reservation?.id || '(new)'}`;
        const operation = reservation ? 'update' : 'create';
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
            <FormField control={form.control} name="eventName" render={({ field }) => (<FormItem><FormLabel>Intitulé</FormLabel><FormControl><Input placeholder="Ex: Réunion pédagogique" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="salleId" render={({ field }) => (
                <FormItem><FormLabel>Salle</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Choisir une salle" /></SelectTrigger></FormControl><SelectContent>{salles.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startTime" render={({ field }) => (<FormItem><FormLabel>Début</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="endTime" render={({ field }) => (<FormItem><FormLabel>Fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="confirmée">Confirmée</SelectItem><SelectItem value="en_attente">En attente</SelectItem><SelectItem value="annulée">Annulée</SelectItem></SelectContent></Select></FormItem>)} />
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (optionnel)</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
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
