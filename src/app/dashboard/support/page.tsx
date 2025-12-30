'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Le sujet doit contenir au moins 5 caractères.'),
  category: z.enum(['question', 'bug', 'feature_request', 'billing', 'other']),
  description: z.string().min(20, 'Veuillez décrire votre problème plus en détail (20 caractères min).'),
});

type SupportTicketFormValues = z.infer<typeof supportTicketSchema>;

export default function SupportPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupportTicketFormValues>({
      resolver: zodResolver(supportTicketSchema),
      defaultValues: {
          category: 'question',
      }
  });

  const handleSubmit = async (values: SupportTicketFormValues) => {
    if (!user || !user.uid || !user.schoolId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non identifié.'});
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

    addDoc(collectionRef, dataToSave)
      .then(() => {
        setIsSubmitted(true);
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Ticket envoyé !</h2>
            <p className="text-muted-foreground mb-6">
              Merci pour votre message. Notre équipe d'assistance vous répondra dans les plus brefs délais.
            </p>
            <Button onClick={() => { setIsSubmitted(false); form.reset(); }}>
              Soumettre un autre ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold">Support Technique</h1>
            <p className="text-muted-foreground">
                Soumettez une question ou signalez un problème à notre équipe.
            </p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Ouvrir un nouveau ticket</CardTitle>
                <CardDescription>
                    Décrivez votre demande aussi précisément que possible.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Veuillez décrire en détail votre problème ou votre question..." {...field} rows={8}/></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                            {isSubmitting ? 'Envoi en cours...' : 'Envoyer le ticket'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}