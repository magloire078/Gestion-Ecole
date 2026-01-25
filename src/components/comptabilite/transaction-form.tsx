'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Combobox } from '@/components/ui/combobox';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { format } from 'date-fns';
import type { accountingTransaction as AccountingTransaction } from '@/lib/data-types';

const transactionSchema = z.object({
    description: z.string().min(1, { message: "La description est requise." }),
    amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
    type: z.enum(['Revenu', 'Dépense'], { required_error: "Le type est requis." }),
    category: z.string().min(1, { message: "La catégorie est requise." }),
    date: z.string().min(1, { message: "La date est requise." }),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
    schoolId: string;
    transaction: (AccountingTransaction & { id: string }) | null;
    onSave: () => void;
}

export function TransactionForm({ schoolId, transaction: editingTransaction, onSave }: TransactionFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [allCategories, setAllCategories] = useState({
        Revenu: ['Scolarité', 'Dons', 'Événements'],
        Dépense: ['Salaires', 'Fournitures', 'Maintenance', 'Services Publics', 'Marketing']
    });

    const [todayDateString, setTodayDateString] = useState('');
    useEffect(() => {
        setTodayDateString(format(new Date(), 'yyyy-MM-dd'));
    }, []);

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            description: "",
            amount: 0,
            type: "Dépense",
            category: "",
            date: '',
        },
    });

    const watchedType = form.watch('type');

    useEffect(() => {
        if (editingTransaction) {
            form.reset({
                ...editingTransaction,
                date: format(new Date(editingTransaction.date), 'yyyy-MM-dd'),
            });
        } else if (todayDateString) {
            form.reset({
                description: "",
                amount: 0,
                type: "Dépense",
                category: "",
                date: todayDateString,
            });
        }
    }, [editingTransaction, form, todayDateString]);
    
    useEffect(() => {
        form.setValue('category', '');
    }, [watchedType, form]);

    const handleTransactionSubmit = async (values: TransactionFormValues) => {
        setIsSubmitting(true);
        const transactionData = {
            ...values,
            schoolId,
            date: format(new Date(values.date), "yyyy-MM-dd"),
        };

        const collectionRef = collection(firestore, `ecoles/${schoolId}/comptabilite`);

        const promise = editingTransaction
            ? setDoc(doc(collectionRef, editingTransaction.id!), transactionData, { merge: true })
            : addDoc(collectionRef, transactionData);

        try {
            await promise;
            toast({
                title: `Transaction ${editingTransaction ? 'modifiée' : 'ajoutée'}`,
                description: "La transaction a été enregistrée.",
            });
            onSave();
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({
                path: editingTransaction ? doc(collectionRef, editingTransaction.id!).path : collectionRef.path,
                operation: 'write',
                requestResourceData: transactionData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateCategory = (newCategory: string) => {
        setAllCategories(prev => {
            const newCategoriesForType = [...prev[watchedType], newCategory];
            return { ...prev, [watchedType]: newCategoriesForType };
        });
        toast({ title: 'Catégorie créée', description: `La catégorie "${newCategory}" a été ajoutée.` });
        form.setValue('category', newCategory);
        return Promise.resolve({ value: newCategory, label: newCategory });
    };

    const categoryOptions = allCategories[watchedType].map(cat => ({ value: cat, label: cat }));

    return (
        <Form {...form}>
            <form id="transaction-form" onSubmit={form.handleSubmit(handleTransactionSubmit)} className="grid gap-4 py-4">
                 <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="col-span-3 flex items-center space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="Revenu" id="r1" />
                            </FormControl>
                            <FormLabel htmlFor="r1" className="font-normal">Revenu</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="Dépense" id="r2" />
                            </FormControl>
                            <FormLabel htmlFor="r2" className="font-normal">Dépense</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right">Catégorie</FormLabel>
                        <FormControl className="col-span-3">
                            <Combobox
                                placeholder="Sélectionner une catégorie"
                                searchPlaceholder="Chercher ou créer..."
                                options={categoryOptions}
                                value={field.value}
                                onValueChange={field.onChange}
                                onCreate={handleCreateCategory}
                            />
                        </FormControl>
                         <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right">Description</FormLabel>
                        <FormControl className="col-span-3">
                            <Input {...field} />
                        </FormControl>
                         <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right">Montant (CFA)</FormLabel>
                         <FormControl className="col-span-3">
                            <Input type="number" {...field} />
                        </FormControl>
                         <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right">Date</FormLabel>
                         <FormControl className="col-span-3">
                            <Input type="date" {...field} />
                        </FormControl>
                         <FormMessage className="col-start-2 col-span-3" />
                    </FormItem>
                    )}
                />
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
