'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const paymentSchema = z.object({
  paymentDate: z.string().min(1, "La date est requise."),
  paymentDescription: z.string().min(1, "La description est requise."),
  paymentAmount: z.coerce.number().positive("Le montant doit être un nombre positif."),
  payerFirstName: z.string().min(1, "Le prénom du payeur est requis."),
  payerLastName: z.string().min(1, "Le nom de la personne qui a effectué le paiement est requis."),
  payerContact: z.string().optional(),
  paymentMethod: z.string().min(1, "Le mode de paiement est requis."),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
    onSubmit: (values: PaymentFormValues) => Promise<void>;
    initialData: Partial<PaymentFormValues>;
    isSaving: boolean;
    onCancel: () => void;
}

export function PaymentForm({ onSubmit, initialData, isSaving, onCancel }: PaymentFormProps) {
    const form = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: initialData,
    });
    const { reset } = form;

    useEffect(() => {
        reset(initialData);
    }, [initialData, reset]);

    return (
        <Form {...form}>
            <form id="payment-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <FormField control={form.control} name="paymentDate" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="paymentDescription" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="paymentAmount" render={({ field }) => (<FormItem><FormLabel>Montant Payé</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Mode de paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Espèces">Espèces</SelectItem><SelectItem value="Chèque">Chèque</SelectItem><SelectItem value="Virement Bancaire">Virement Bancaire</SelectItem><SelectItem value="Paiement Mobile">Paiement Mobile</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="payerFirstName" render={({ field }) => (<FormItem><FormLabel>Prénom du Payeur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="payerLastName" render={({ field }) => (<FormItem><FormLabel>Nom du Payeur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="payerContact" render={({ field }) => (<FormItem><FormLabel>Contact Payeur</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            </form>
             <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Annuler</Button>
                <Button type="submit" form="payment-form" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Enregistrer
                </Button>
            </DialogFooter>
        </Form>
    );
}
