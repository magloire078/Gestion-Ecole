
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { school as School } from '@/lib/data-types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const schoolEditSchema = z.object({
  name: z.string().min(2, "Le nom de l'école est requis."),
  status: z.enum(['active', 'suspended', 'deleted']),
  'subscription.plan': z.enum(['Essentiel', 'Pro', 'Premium']),
  'subscription.status': z.enum(['active', 'trialing', 'past_due', 'canceled']),
});

type SchoolEditFormValues = z.infer<typeof schoolEditSchema>;

interface SchoolEditFormProps {
  school: School & { id: string };
  onSave: () => void;
}

export function SchoolEditForm({ school, onSave }: SchoolEditFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SchoolEditFormValues>({
    resolver: zodResolver(schoolEditSchema),
    defaultValues: {
      name: school.name,
      status: school.status,
      'subscription.plan': school.subscription?.plan || 'Essentiel',
      'subscription.status': school.subscription?.status || 'trialing',
    },
  });

  const handleSubmit = async (values: SchoolEditFormValues) => {
    setIsSubmitting(true);
    const schoolRef = doc(firestore, 'ecoles', school.id);
    try {
      await updateDoc(schoolRef, {
        name: values.name,
        status: values.status,
        'subscription.plan': values['subscription.plan'],
        'subscription.status': values['subscription.status'],
      });
      toast({ title: 'École modifiée', description: 'Les informations ont été mises à jour.' });
      onSave();
    } catch (e) {
      console.error("Error updating school:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour les informations de l\'école.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Nom de l'école</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Statut de l'école</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
                <SelectItem value="deleted">Supprimé (Corbeille)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="subscription.plan" render={({ field }) => (
          <FormItem>
            <FormLabel>Plan d'abonnement</FormLabel>
             <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="Essentiel">Essentiel</SelectItem>
                <SelectItem value="Pro">Pro</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
         <FormField control={form.control} name="subscription.status" render={({ field }) => (
          <FormItem>
            <FormLabel>Statut de l'abonnement</FormLabel>
             <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="trialing">En essai</SelectItem>
                <SelectItem value="past_due">En retard</SelectItem>
                 <SelectItem value="canceled">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer les modifications
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
