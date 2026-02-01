'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

type AcademicPeriod = {
    name: string;
    startDate: string;
    endDate: string;
};

const periodSchema = z.object({
    name: z.string().min(1, "Le nom est requis."),
    startDate: z.string().min(1, "La date de début est requise."),
    endDate: z.string().min(1, "La date de fin est requise."),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
    message: "La date de fin doit être après la date de début.",
    path: ["endDate"],
});
type PeriodFormValues = z.infer<typeof periodSchema>;

interface AcademicPeriodFormProps {
    existingPeriods: AcademicPeriod[];
    editingPeriod: AcademicPeriod | null;
    onSave: (updatedPeriods: AcademicPeriod[]) => Promise<void>;
    onCancel: () => void;
}

export function AcademicPeriodForm({ existingPeriods, editingPeriod, onSave, onCancel }: AcademicPeriodFormProps) {
    const [isSaving, setIsSaving] = useState(false);
    const form = useForm<PeriodFormValues>({
        resolver: zodResolver(periodSchema),
        defaultValues: editingPeriod 
            ? {
                ...editingPeriod,
                startDate: format(new Date(editingPeriod.startDate), 'yyyy-MM-dd'),
                endDate: format(new Date(editingPeriod.endDate), 'yyyy-MM-dd'),
              } 
            : {
                name: '',
                startDate: format(new Date(), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
            }
    });

    const handleFormSubmit = async (values: PeriodFormValues) => {
        setIsSaving(true);
        let updatedPeriods;
        if (editingPeriod) {
            // Update existing period
            updatedPeriods = existingPeriods.map(p => p.name === editingPeriod.name ? values : p);
        } else {
            // Add new period
            if (existingPeriods.some(p => p.name === values.name)) {
                form.setError('name', { message: 'Une période avec ce nom existe déjà.' });
                setIsSaving(false);
                return;
            }
            updatedPeriods = [...existingPeriods, values];
        }
        
        // Sort periods by start date
        updatedPeriods.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        
        await onSave(updatedPeriods);
        setIsSaving(false);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nom de la période</FormLabel>
                            <FormControl><Input placeholder="Ex: Trimestre 1" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Date de début</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Date de fin</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
