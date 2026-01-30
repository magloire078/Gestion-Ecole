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
import type { transportSubscription as TransportSubscription, student as Student, route as Route } from '@/lib/data-types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { DialogFooter } from '../ui/dialog';

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
  onSave: () => void;
}

export function SubscriptionForm({ schoolId, students, routes, subscription, onSave }: SubscriptionFormProps) {
  const firestore = useFirestore();
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

  const handleSubmit = async (values: SubscriptionFormValues) => {
    setIsSubmitting(true);
    
    const dataToSave = { ...values };

    const promise = subscription && subscription.id
        ? setDoc(doc(firestore, `ecoles/${schoolId}/transport_abonnements/${subscription.id}`), dataToSave, { merge: true })
        : addDoc(collection(firestore, `ecoles/${schoolId}/transport_abonnements`), dataToSave);

    try {
        await promise;
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
                <FormItem><FormLabel>Ligne</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une ligne" /></SelectTrigger></FormControl><SelectContent>{routes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
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
            <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Prix (CFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
