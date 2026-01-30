
'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { canteenSubscription as CanteenSubscription, student as Student } from '@/lib/data-types';
import { format, addMonths, addYears, startOfYear, endOfYear, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { DialogFooter } from '../ui/dialog';

const subscriptionFormSchema = z.object({
  studentId: z.string().min(1, 'Veuillez sélectionner un élève.'),
  type: z.enum(['ponctuel', 'hebdomadaire', 'mensuel', 'trimestriel', 'annuel']),
  startDate: z.string().min(1, 'La date de début est requise.'),
  endDate: z.string().min(1, 'La date de fin est requise.'),
  price: z.coerce.number().min(0, 'Le prix doit être positif.'),
  status: z.enum(['active', 'inactive', 'expired']),
  autoRenew: z.boolean().default(false),
});

type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

interface SubscriptionFormProps {
  schoolId: string;
  students: (Student & { id: string })[];
  subscription: (CanteenSubscription & { id: string }) | null;
  onSave: () => void;
}

export function SubscriptionForm({ schoolId, students, subscription, onSave }: SubscriptionFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: subscription ? {
      ...subscription,
      price: subscription.price || 0,
      autoRenew: subscription.autoRenew || false,
    } : {
      type: 'mensuel',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      price: 25000,
      status: 'active',
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
    
    switch(watchedType) {
        case 'mensuel': endDate = addMonths(startDate, 1); break;
        case 'trimestriel': endDate = addMonths(startDate, 3); break;
        case 'annuel': endDate = endOfYear(startDate); break;
    }
    setValue('endDate', format(endDate, 'yyyy-MM-dd'));

  }, [watchedType, watchedStartDate, setValue]);

  const handleSubmit = async (values: SubscriptionFormValues) => {
    setIsSubmitting(true);
    
    const dataToSave: Omit<CanteenSubscription, 'id'> = {
        studentId: values.studentId,
        type: values.type,
        startDate: values.startDate,
        endDate: values.endDate,
        price: values.price,
        status: values.status,
        autoRenew: values.autoRenew,
        mealType: 'dejeuner',
    };

    try {
        if (subscription && subscription.id) {
            const subRef = doc(firestore, `ecoles/${schoolId}/cantine_abonnements/${subscription.id}`);
            await setDoc(subRef, dataToSave, { merge: true });
        } else {
            const subsCollectionRef = collection(firestore, `ecoles/${schoolId}/cantine_abonnements`);
            await addDoc(subsCollectionRef, dataToSave);
        }
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
            )}/>
            <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Type d'abonnement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="mensuel">Mensuel</SelectItem><SelectItem value="trimestriel">Trimestriel</SelectItem><SelectItem value="annuel">Annuel</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Date de début</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem><FormLabel>Date de fin</FormLabel><FormControl><Input type="date" {...field} readOnly /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Prix (CFA)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Statut</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="active">Actif</SelectItem><SelectItem value="inactive">Inactif</SelectItem><SelectItem value="expired">Expiré</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )}/>
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
