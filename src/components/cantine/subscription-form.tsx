
'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import type { canteenSubscription as CanteenSubscription, student as Student } from '@/lib/data-types';
import { format, addMonths, endOfYear, eachDayOfInterval, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { DialogFooter } from '../ui/dialog';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { prepareServicePaymentTransaction } from '@/lib/service-payment';
import { resolveAcademicYearForWrite } from '@/lib/academic-year-utils';

const subscriptionFormSchema = z.object({
  studentId: z.string().min(1, 'Veuillez sélectionner un élève.'),
  type: z.enum(['ponctuel', 'hebdomadaire', 'mensuel', 'trimestriel', 'annuel']),
  startDate: z.string().min(1, 'La date de début est requise.'),
  endDate: z.string().min(1, 'La date de fin est requise.'),
  price: z.coerce.number().min(0, 'Le prix doit être positif.'),
  status: z.enum(['active', 'inactive', 'expired']),
  paymentStatus: z.enum(['unpaid', 'paid']),
  autoRenew: z.boolean().default(false),
});

/** Nombre de jours ouvrés (lun-ven) dans l'intervalle, utilisé comme allocation initiale de repas. */
function countWeekdays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (!isValid(start) || !isValid(end) || end < start) return 0;
  return eachDayOfInterval({ start, end }).filter(d => d.getDay() !== 0 && d.getDay() !== 6).length;
}

type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

interface SubscriptionFormProps {
  schoolId: string;
  students: (Student & { id: string })[];
  subscription: (CanteenSubscription & { id: string }) | null;
  onSave: () => void;
}

export function SubscriptionForm({ schoolId, students, subscription, onSave }: SubscriptionFormProps) {
  const firestore = useFirestore();
  const { schoolData } = useSchoolData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: subscription ? {
      ...subscription,
      price: subscription.price || 0,
      autoRenew: subscription.autoRenew || false,
      paymentStatus: subscription.paymentStatus || 'unpaid',
    } : {
      type: 'mensuel',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      price: 25000,
      status: 'active',
      paymentStatus: 'unpaid',
      autoRenew: false,
    },
  });
  const { setValue } = form;

  const watchedType = useWatch({ control: form.control, name: 'type' });
  const watchedStartDate = useWatch({ control: form.control, name: 'startDate' });

  useEffect(() => {
    if (!watchedStartDate) return;
    const startDate = new Date(watchedStartDate);
    if (!isValid(startDate)) return;

    let endDate = new Date(startDate);

    switch (watchedType) {
      case 'mensuel': endDate = addMonths(startDate, 1); break;
      case 'trimestriel': endDate = addMonths(startDate, 3); break;
      case 'annuel': endDate = endOfYear(startDate); break;
    }
    setValue('endDate', format(endDate, 'yyyy-MM-dd'));

  }, [watchedType, watchedStartDate, setValue]);

  const handleSubmit = async (values: SubscriptionFormValues) => {
    setIsSubmitting(true);

    const dataToSave: Record<string, unknown> = {
      studentId: values.studentId,
      type: values.type,
      startDate: values.startDate,
      endDate: values.endDate,
      price: values.price,
      status: values.status,
      paymentStatus: values.paymentStatus,
      autoRenew: values.autoRenew,
      mealType: 'dejeuner',
    };

    // Allocation initiale de repas restants, à la création seulement (une
    // édition ne doit pas réinitialiser une consommation déjà décomptée).
    if (!subscription) {
      dataToSave.remainingMeals = countWeekdays(values.startDate, values.endDate);
      dataToSave.academicYear = resolveAcademicYearForWrite({
        schoolCurrentYear: (schoolData as any)?.currentAcademicYear,
        docDate: values.startDate,
      });
    }

    try {
      const batch = writeBatch(firestore);
      const subRef = subscription && subscription.id
        ? doc(firestore, `ecoles/${schoolId}/cantine_abonnements/${subscription.id}`)
        : doc(collection(firestore, `ecoles/${schoolId}/cantine_abonnements`));

      // N'enregistre le paiement en comptabilité qu'une seule fois : dès
      // qu'un abonnement passe (ou est créé) à "Payé" et qu'aucune
      // transaction n'a encore été rattachée.
      if (values.paymentStatus === 'paid' && !subscription?.accountingTransactionId) {
        const { ref: txRef, data: txData } = prepareServicePaymentTransaction(firestore, schoolId, {
          category: 'Cantine',
          description: `Abonnement cantine (${values.type})`,
          amount: values.price,
          date: values.startDate,
          studentId: values.studentId,
          schoolCurrentYear: (schoolData as any)?.currentAcademicYear,
        });
        batch.set(txRef, txData);
        dataToSave.accountingTransactionId = txRef.id;
      }

      batch.set(subRef, dataToSave, { merge: true });
      await batch.commit();
      toast({ title: 'Abonnement enregistré', description: 'L\'abonnement a été mis à jour.' });
      onSave();
    } catch (e) {
      console.error("Error saving subscription:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer l\'abonnement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
          <FormField control={form.control} name="studentId" render={({ field }) => (
            <FormItem><FormLabel>Élève</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!!subscription}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger></FormControl><SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id!}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem><FormLabel>Type d&apos;abonnement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="mensuel">Mensuel</SelectItem><SelectItem value="trimestriel">Trimestriel</SelectItem><SelectItem value="annuel">Annuel</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Date de début</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem><FormLabel>Date de fin</FormLabel><FormControl><Input type="date" {...field} readOnly /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Prix ({getCurrencySymbol()})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="inactive">Inactif</SelectItem><SelectItem value="expired">Expiré</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="paymentStatus" render={({ field }) => (
              <FormItem><FormLabel>Paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="paid">Payé</SelectItem><SelectItem value="unpaid">Impayé</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
          </div>
          <FormField
            control={form.control}
            name="autoRenew"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Renouvellement automatique
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
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
