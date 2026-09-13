
'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, writeBatch, collection, query, where, increment } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import type { canteenReservation as CanteenReservation, canteenSubscription as CanteenSubscription, student as Student } from '@/lib/data-types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState, useEffect } from 'react';
import { DialogFooter } from '../ui/dialog';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { prepareServicePaymentTransaction } from '@/lib/service-payment';
import { resolveAcademicYearForWrite } from '@/lib/academic-year-utils';

const reservationFormSchema = z.object({
  studentId: z.string().min(1, 'Veuillez sélectionner un élève.'),
  date: z.string().min(1, 'La date est requise.'),
  mealType: z.enum(['petit_dejeuner', 'dejeuner', 'gouter', 'diner']),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'attended']),
  paymentStatus: z.enum(['unpaid', 'paid', 'partially_paid']),
  price: z.coerce.number().min(0, 'Le prix doit être positif.'),
  paidAmount: z.coerce.number().min(0).optional(),
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
  const { schoolData } = useSchoolData();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation, form]);

  const watchedStudentId = useWatch({ control: form.control, name: 'studentId' });
  const watchedDate = useWatch({ control: form.control, name: 'date' });
  const watchedMealType = useWatch({ control: form.control, name: 'mealType' });
  const watchedPaymentStatus = useWatch({ control: form.control, name: 'paymentStatus' });
  const watchedPrice = useWatch({ control: form.control, name: 'price' });

  // Abonnement cantine actif de l'élève sélectionné (pour décrémenter le
  // compteur de repas restants à la création d'une réservation).
  const activeSubQuery = useMemo(() =>
    (schoolId && watchedStudentId) ? query(
      collection(firestore, `ecoles/${schoolId}/cantine_abonnements`),
      where('studentId', '==', watchedStudentId),
      where('status', '==', 'active'),
    ) : null,
    [firestore, schoolId, watchedStudentId]);
  const { data: activeSubsData } = useCollection(activeSubQuery);

  const matchingSubscription = useMemo(() => {
    if (!activeSubsData || !watchedDate) return null;
    const target = new Date(watchedDate).getTime();
    for (const d of activeSubsData) {
      const sub = { id: d.id, ...d.data() } as CanteenSubscription & { id: string };
      if (new Date(sub.startDate).getTime() <= target && target <= new Date(sub.endDate).getTime()) {
        return sub;
      }
    }
    return null;
  }, [activeSubsData, watchedDate]);

  // Réservations du même jour et du même type de repas, pour vérifier le
  // quota de capacité journalière de la cantine.
  const sameDayQuery = useMemo(() =>
    (schoolId && watchedDate) ? query(
      collection(firestore, `ecoles/${schoolId}/cantine_reservations`),
      where('date', '==', watchedDate),
    ) : null,
    [firestore, schoolId, watchedDate]);
  const { data: sameDayData } = useCollection(sameDayQuery);

  const sameDayCount = useMemo(() => {
    if (!sameDayData) return 0;
    return sameDayData.filter(d => {
      if (d.id === reservation?.id) return false;
      const data = d.data() as CanteenReservation;
      return data.mealType === watchedMealType && data.status !== 'cancelled';
    }).length;
  }, [sameDayData, watchedMealType, reservation?.id]);

  const dailyCapacity = schoolData?.cantineDailyCapacity;
  const isAtCapacity = !!dailyCapacity && sameDayCount >= dailyCapacity && !reservation;

  const handleSubmit = async (values: ReservationFormValues) => {
    if (!reservation && values.status !== 'cancelled' && dailyCapacity && sameDayCount >= dailyCapacity) {
        toast({
            variant: 'destructive',
            title: 'Capacité de la cantine atteinte',
            description: `La cantine a déjà atteint sa capacité de ${dailyCapacity} repas pour ce service à cette date.`,
        });
        return;
    }

    setIsSubmitting(true);

    const dataToSave: Record<string, unknown> = { ...values };
    if (values.paymentStatus !== 'partially_paid') {
        delete dataToSave.paidAmount;
    }
    if (!reservation) {
        dataToSave.academicYear = resolveAcademicYearForWrite({
            schoolCurrentYear: (schoolData as any)?.currentAcademicYear,
            docDate: values.date,
        });
    }

    try {
        const batch = writeBatch(firestore);
        const resRef = reservation && reservation.id
            ? doc(firestore, `ecoles/${schoolId}/cantine_reservations/${reservation.id}`)
            : doc(collection(firestore, `ecoles/${schoolId}/cantine_reservations`));

        // N'enregistre le paiement en comptabilité qu'une seule fois : dès
        // qu'une réservation passe (ou est créée) à "Payé"/"Partiel" et
        // qu'aucune transaction n'a encore été rattachée.
        const amountPaid = values.paymentStatus === 'paid' ? values.price
            : values.paymentStatus === 'partially_paid' ? (values.paidAmount || 0)
            : 0;
        if (amountPaid > 0 && !reservation?.accountingTransactionId) {
            const { ref: txRef, data: txData } = prepareServicePaymentTransaction(firestore, schoolId, {
                category: 'Cantine',
                description: `Repas cantine (${values.mealType}) — ${format(new Date(values.date), 'dd/MM/yyyy')}`,
                amount: amountPaid,
                date: values.date,
                studentId: values.studentId,
                schoolCurrentYear: (schoolData as any)?.currentAcademicYear,
            });
            batch.set(txRef, txData);
            dataToSave.accountingTransactionId = txRef.id;
        }

        // Décrémente le compteur de repas restants de l'abonnement actif
        // couvrant cette date, uniquement à la création (pas en édition,
        // pour éviter de décompter plusieurs fois la même réservation).
        if (!reservation && values.status !== 'cancelled' && matchingSubscription) {
            batch.update(doc(firestore, `ecoles/${schoolId}/cantine_abonnements/${matchingSubscription.id}`), {
                remainingMeals: increment(-1),
            });
            dataToSave.linkedSubscriptionId = matchingSubscription.id;
        }

        batch.set(resRef, dataToSave, { merge: true });
        await batch.commit();
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
            {matchingSubscription && (
                <p className="text-xs text-muted-foreground">
                    Couvert par un abonnement actif — {matchingSubscription.remainingMeals ?? 0} repas restants avant cette réservation.
                </p>
            )}
            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            {dailyCapacity && (
                <p className={isAtCapacity ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
                    {sameDayCount} / {dailyCapacity} repas réservés pour ce service{isAtCapacity ? ' — capacité atteinte' : ''}
                </p>
            )}
            <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Prix ({getCurrencySymbol()})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="pending">En attente</SelectItem><SelectItem value="confirmed">Confirmé</SelectItem><SelectItem value="attended">Présent</SelectItem><SelectItem value="cancelled">Annulé</SelectItem></SelectContent></Select></FormItem>)} />
              <FormField control={form.control} name="paymentStatus" render={({ field }) => (<FormItem><FormLabel>Paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="unpaid">Impayé</SelectItem><SelectItem value="paid">Payé</SelectItem><SelectItem value="partially_paid">Partiel</SelectItem></SelectContent></Select></FormItem>)} />
            </div>
            {watchedPaymentStatus === 'partially_paid' && (
                <FormField control={form.control} name="paidAmount" render={({ field }) => (
                    <FormItem><FormLabel>Montant versé ({getCurrencySymbol()})</FormLabel><FormControl><Input type="number" {...field} max={watchedPrice} /></FormControl><FormMessage /></FormItem>
                )} />
            )}
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
