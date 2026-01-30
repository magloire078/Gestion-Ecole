
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
import type { canteenReservation as CanteenReservation, student as Student } from '@/lib/data-types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { DialogFooter } from '../ui/dialog';

const reservationFormSchema = z.object({
  studentId: z.string().min(1, 'Veuillez sélectionner un élève.'),
  date: z.string().min(1, 'La date est requise.'),
  mealType: z.enum(['petit_dejeuner', 'dejeuner', 'gouter', 'diner']),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'attended']),
  paymentStatus: z.enum(['unpaid', 'paid', 'partially_paid']),
  price: z.coerce.number().min(0, 'Le prix doit être positif.'),
});

type ReservationFormValues = z.infer<typeof reservationFormSchema>;

interface ReservationFormProps {
  schoolId: string;
  students: Student[];
  reservation: (CanteenReservation & { id: string }) | null;
  onSave: () => void;
}

export function ReservationForm({ schoolId, students, reservation, onSave }: ReservationFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: ReservationFormValues = {
      date: format(new Date(), 'yyyy-MM-dd'),
      mealType: 'dejeuner',
      status: 'confirmed',
      paymentStatus: 'unpaid',
      price: 1500,
      studentId: '',
  };

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: reservation ? {
      ...reservation,
      date: format(new Date(reservation.date), 'yyyy-MM-dd'),
    } : defaultValues,
  });

  useEffect(() => {
    form.reset(reservation ? {
        ...reservation,
        date: format(new Date(reservation.date), 'yyyy-MM-dd'),
    } : defaultValues);
  }, [reservation, form, defaultValues]);

  const handleSubmit = async (values: ReservationFormValues) => {
    setIsSubmitting(true);
    
    const dataToSave = { ...values };

    try {
        if (reservation && reservation.id) {
            const resRef = doc(firestore, `ecoles/${schoolId}/cantine_reservations/${reservation.id}`);
            await setDoc(resRef, dataToSave, { merge: true });
        } else {
            const resCollectionRef = collection(firestore, `ecoles/${schoolId}/cantine_reservations`);
            await addDoc(resCollectionRef, dataToSave);
        }
        toast({ title: 'Réservation enregistrée', description: 'La réservation a été enregistrée avec succès.' });
        onSave();
    } catch (e) {
        console.error("Error saving reservation:", e);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer la réservation.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
            <FormField control={form.control} name="studentId" render={({ field }) => (
                <FormItem><FormLabel>Élève</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!!reservation}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger></FormControl><SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id!}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Prix (CFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="pending">En attente</SelectItem><SelectItem value="confirmed">Confirmé</SelectItem><SelectItem value="attended">Présent</SelectItem><SelectItem value="cancelled">Annulé</SelectItem></SelectContent></Select></FormItem>)} />
              <FormField control={form.control} name="paymentStatus" render={({ field }) => (<FormItem><FormLabel>Paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="unpaid">Impayé</SelectItem><SelectItem value="paid">Payé</SelectItem><SelectItem value="partially_paid">Partiel</SelectItem></SelectContent></Select></FormItem>)} />
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
