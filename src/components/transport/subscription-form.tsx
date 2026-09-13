'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, writeBatch, collection, type DocumentReference } from 'firebase/firestore';
import { useDoc, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import type { transportSubscription as TransportSubscription, student as Student, route as Route, bus as Bus } from '@/lib/data-types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState } from 'react';
import { DialogFooter } from '../ui/dialog';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { prepareServicePaymentTransaction } from '@/lib/service-payment';
import { resolveAcademicYearForWrite } from '@/lib/academic-year-utils';

const subscriptionFormSchema = z.object({
  studentId: z.string().min(1, 'Veuillez sélectionner un élève.'),
  routeId: z.string().min(1, 'Veuillez sélectionner une ligne.'),
  stopId: z.string().optional(), // Pour l'instant optionnel
  type: z.enum(['aller_seul', 'retour_seul', 'aller_retour']),
  period: z.enum(['trimestriel', 'semestriel', 'annuel']),
  startDate: z.string().min(1, 'La date de début est requise.'),
  endDate: z.string().min(1, 'La date de fin est requise.'),
  price: z.coerce.number().min(0, 'Le prix doit être positif.'),
  paymentStatus: z.enum(['unpaid', 'paid']),
  status: z.enum(['active', 'inactive']),
});

type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

interface SubscriptionFormProps {
  schoolId: string;
  students: (Student & { id: string })[];
  routes: (Route & { id: string })[];
  subscription: (TransportSubscription & { id: string }) | null;
  /** Tous les abonnements existants (toutes lignes confondues), pour vérifier la capacité du bus. */
  activeSubscriptions: (TransportSubscription & { id: string })[];
  onSave: () => void;
}

export function SubscriptionForm({ schoolId, students, routes, subscription, activeSubscriptions, onSave }: SubscriptionFormProps) {
  const firestore = useFirestore();
  const { schoolData } = useSchoolData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: subscription ? {
      ...subscription,
       startDate: format(new Date(subscription.startDate), 'yyyy-MM-dd'),
       endDate: format(new Date(subscription.endDate), 'yyyy-MM-dd'),
    } : {
      type: 'aller_retour',
      period: 'annuel',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      price: 0,
      status: 'active',
      paymentStatus: 'unpaid',
    },
  });

  const watchedRouteId = useWatch({ control: form.control, name: 'routeId' });
  const selectedRoute = useMemo(() => routes.find(r => r.id === watchedRouteId), [routes, watchedRouteId]);

  const busRef = useMemo(() =>
    selectedRoute?.busId ? doc(firestore, `ecoles/${schoolId}/transport_bus/${selectedRoute.busId}`) as DocumentReference<Bus> : null,
    [firestore, schoolId, selectedRoute?.busId]);
  const { data: selectedBus } = useDoc<Bus>(busRef);

  const activeCountOnRoute = useMemo(() =>
    activeSubscriptions.filter(s =>
      s.routeId === watchedRouteId &&
      s.status === 'active' &&
      s.id !== subscription?.id
    ).length,
    [activeSubscriptions, watchedRouteId, subscription?.id]);

  const isAtCapacity = !!selectedBus && activeCountOnRoute >= selectedBus.capacity;

  const handleSubmit = async (values: SubscriptionFormValues) => {
    if (values.status === 'active' && selectedBus && activeCountOnRoute >= selectedBus.capacity) {
        toast({
            variant: 'destructive',
            title: 'Capacité du bus atteinte',
            description: `Le bus de cette ligne est complet (${selectedBus.capacity} places). Désactivez ou supprimez un autre abonnement d'abord.`,
        });
        return;
    }

    setIsSubmitting(true);

    const dataToSave: Record<string, unknown> = { ...values };
    if (!subscription) {
        dataToSave.academicYear = resolveAcademicYearForWrite({
            schoolCurrentYear: (schoolData as any)?.currentAcademicYear,
            docDate: values.startDate,
        });
    }

    try {
        const batch = writeBatch(firestore);
        const subRef = subscription && subscription.id
            ? doc(firestore, `ecoles/${schoolId}/transport_abonnements/${subscription.id}`)
            : doc(collection(firestore, `ecoles/${schoolId}/transport_abonnements`));

        // N'enregistre le paiement en comptabilité qu'une seule fois : dès
        // qu'un abonnement passe (ou est créé) à "Payé" et qu'aucune
        // transaction n'a encore été rattachée.
        if (values.paymentStatus === 'paid' && !subscription?.accountingTransactionId) {
            const { ref: txRef, data: txData } = prepareServicePaymentTransaction(firestore, schoolId, {
                category: 'Transport',
                description: `Abonnement transport (${values.type}, ${values.period})`,
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
        toast({ title: 'Abonnement enregistré', description: 'L\'abonnement au transport a été mis à jour.' });
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
            )}/>
            <FormField control={form.control} name="routeId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Ligne</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une ligne" /></SelectTrigger></FormControl><SelectContent>{routes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select>
                    {selectedBus && (
                        <p className={isAtCapacity ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
                            {activeCountOnRoute} / {selectedBus.capacity} places occupées{isAtCapacity ? ' — bus complet' : ''}
                        </p>
                    )}
                    <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="aller_retour">Aller-Retour</SelectItem><SelectItem value="aller_seul">Aller Seul</SelectItem><SelectItem value="retour_seul">Retour Seul</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="period" render={({ field }) => (
                <FormItem><FormLabel>Période</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="annuel">Annuel</SelectItem><SelectItem value="trimestriel">Trimestriel</SelectItem><SelectItem value="semestriel">Semestriel</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Date de début</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem><FormLabel>Date de fin</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Prix ({getCurrencySymbol()})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="paymentStatus" render={({ field }) => (<FormItem><FormLabel>Paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="paid">Payé</SelectItem><SelectItem value="unpaid">Impayé</SelectItem></SelectContent></Select></FormItem>)} />
                <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Statut Abonnement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="inactive">Inactif</SelectItem></SelectContent></Select></FormItem>)} />
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
