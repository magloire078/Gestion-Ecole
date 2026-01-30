'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Le sujet doit contenir au moins 5 caractères.'),
  category: z.enum(['question', 'bug', 'feature_request', 'billing', 'other']),
  description: z.string().min(20, 'Veuillez décrire votre problème plus en détail (20 caractères min).'),
});

type SupportTicketFormValues = z.infer<typeof supportTicketSchema>;

interface SupportTicketFormProps {
    onSave: () => void;
}

export function SupportTicketForm({ onSave }: SupportTicketFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupportTicketFormValues>({
      resolver: zodResolver(supportTicketSchema),
      defaultValues: {
          category: 'question',
          subject: '',
          description: '',
      }
  });

  const handleSubmit = async (values: SupportTicketFormValues) => {
    if (!user || !user.uid || !user.schoolId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur ou école non identifié(e).'});
        return;
    }
    setIsSubmitting(true);
    const collectionRef = collection(firestore, 'support_tickets');
    const dataToSave = {
      ...values,
      schoolId: user.schoolId,
      userId: user.uid,
      userDisplayName: user.profile?.displayName || user.authUser?.displayName,
      userEmail: user.profile?.email || user.authUser?.email,
      status: 'open',
      submittedAt: serverTimestamp(),
    };

    try {
        await addDoc(collectionRef, dataToSave);
        toast({ title: 'Ticket envoyé !', description: 'Notre équipe vous répondra bientôt.' });
        onSave();
    } catch (error) {
        console.error("Error submitting ticket:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'envoyer le ticket.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="question">Question générale</SelectItem>
                            <SelectItem value="bug">Signaler un bug</SelectItem>
                            <SelectItem value="feature_request">Demande de fonctionnalité</SelectItem>
                            <SelectItem value="billing">Facturation</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                    </Select>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem><FormLabel>Sujet</FormLabel><FormControl><Input placeholder="Ex: Problème d'affichage des notes" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Veuillez décrire en détail votre problème ou votre question..." {...field} rows={6}/></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                    {isSubmitting ? 'Envoi en cours...' : 'Envoyer le ticket'}
                </Button>
            </DialogFooter>
        </form>
    </Form>
  );
}
