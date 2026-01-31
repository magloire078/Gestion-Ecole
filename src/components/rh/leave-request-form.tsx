
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
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { staff as Staff, staff_leave as StaffLeave } from '@/lib/data-types';
import { format } from 'date-fns';
import { useState } from 'react';

const leaveRequestSchema = z.object({
  staffId: z.string().optional(),
  type: z.enum(["Congé Annuel", "Congé Maladie", "Congé Maternité/Paternité", "Permission Spéciale", "Absence Non Justifiée"]),
  startDate: z.string().min(1, "La date de début est requise."),
  endDate: z.string().min(1, "La date de fin est requise."),
  reason: z.string().min(5, "Un motif est requis."),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
    message: "La date de fin doit être après la date de début.",
    path: ["endDate"],
});
type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

interface LeaveRequestFormProps {
    schoolId: string;
    staffMembers: (Staff & { id: string })[];
    currentUser: { uid: string; displayName: string | null; email: string | null; canManage: boolean };
    onSave: () => void;
}

export function LeaveRequestForm({ schoolId, staffMembers, currentUser, onSave }: LeaveRequestFormProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<LeaveRequestFormValues>({
        resolver: zodResolver(leaveRequestSchema),
        defaultValues: { 
            staffId: currentUser.canManage ? '' : currentUser.uid,
            type: 'Congé Annuel', 
            startDate: format(new Date(), 'yyyy-MM-dd'), 
            endDate: format(new Date(), 'yyyy-MM-dd'), 
            reason: '' 
        }
    });

    const handleFormSubmit = async (values: LeaveRequestFormValues) => {
        if (!schoolId || !currentUser.uid) return;

        const targetStaffId = currentUser.canManage ? values.staffId : currentUser.uid;
        if (!targetStaffId) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un membre du personnel.' });
            return;
        }

        const staffMember = staffMembers.find(s => s.id === targetStaffId);
        const staffName = staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : currentUser.displayName;
        
        setIsSubmitting(true);
        const dataToSave: Omit<StaffLeave, 'id'> = {
            schoolId,
            staffId: targetStaffId,
            staffName: staffName || 'N/A',
            type: values.type,
            startDate: values.startDate,
            endDate: values.endDate,
            reason: values.reason,
            status: 'En attente',
            requestedAt: serverTimestamp(),
        };
        
        try {
            await addDoc(collection(firestore, `ecoles/${schoolId}/conges_personnel`), dataToSave);
            toast({ title: 'Demande envoyée' });
            onSave();
            form.reset();
        } catch(e) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'envoyer la demande.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
         <Form {...form}>
            <form id="leave-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                {currentUser.canManage && (
                    <FormField 
                        control={form.control} 
                        name="staffId" 
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Membre du personnel</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un membre..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {staffMembers.map(staff => (
                                            <SelectItem key={staff.id} value={staff.id}>
                                                {staff.firstName} {staff.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                    )}/>
                )}
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Congé Annuel">Congé Annuel</SelectItem><SelectItem value="Congé Maladie">Congé Maladie</SelectItem><SelectItem value="Congé Maternité/Paternité">Congé Maternité/Paternité</SelectItem><SelectItem value="Permission Spéciale">Permission Spéciale</SelectItem><SelectItem value="Absence Non Justifiée">Absence Non Justifiée</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Date de début</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem><FormLabel>Date de fin</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                 <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Motif</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
            
                <DialogFooter className="pt-4">
                    <Button variant="outline" type="button" onClick={onSave}>Annuler</Button>
                    <Button type="submit" disabled={isSubmitting}>Soumettre la demande</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
