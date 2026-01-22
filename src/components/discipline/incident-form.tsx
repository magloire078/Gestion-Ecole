'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import type { student as Student } from '@/lib/data-types';
import { useEffect } from 'react';

const incidentSchema = z.object({
  studentId: z.string().min(1, "Veuillez sélectionner un élève."),
  type: z.enum(["Avertissement Oral", "Avertissement Écrit", "Retenue", "Mise à pied", "Exclusion temporaire", "Exclusion définitive"]),
  reason: z.string().min(5, "La raison doit être plus détaillée."),
  actionsTaken: z.string().optional(),
  parentNotified: z.boolean().default(false),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

interface IncidentFormProps {
    schoolId: string;
    students: (Student & {id: string})[];
    onSave: () => void;
    student?: Student & { id: string };
}

export function IncidentForm({ schoolId, students, onSave, student }: IncidentFormProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const firestore = useFirestore();

    const form = useForm<IncidentFormValues>({
        resolver: zodResolver(incidentSchema),
        defaultValues: {
            studentId: student?.id || '',
            type: 'Avertissement Oral',
            reason: '',
            actionsTaken: '',
            parentNotified: false,
        }
    });

    useEffect(() => {
        if (student) {
            form.setValue('studentId', student.id!);
        }
    }, [student, form]);

    const handleAddIncident = async (values: IncidentFormValues) => {
        if (!user || !user.authUser) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté pour effectuer cette action.' });
            return;
        }

        const studentId = student?.id || values.studentId;
        const studentInfo = student || students.find(s => s.id === studentId);

        if (!studentInfo) {
            toast({ variant: 'destructive', title: 'Erreur', description: "Informations de l'élève introuvables." });
            return;
        }

        const incidentData = {
            studentId: studentInfo.id,
            studentName: `${studentInfo.firstName} ${studentInfo.lastName}`,
            classId: studentInfo.classId,
            date: new Date().toISOString(),
            type: values.type,
            reason: values.reason,
            actionsTaken: values.actionsTaken,
            parentNotified: values.parentNotified,
            reportedById: user.authUser.uid,
            reportedByName: user.authUser.displayName || 'Système',
            followUpNotes: '',
        };

        const collectionRef = collection(firestore, `ecoles/${schoolId}/incidents_disciplinaires`);
        addDoc(collectionRef, incidentData)
            .then(() => {
                toast({ title: 'Incident enregistré', description: "Le nouvel incident disciplinaire a été ajouté." });
                onSave();
            })
            .catch(error => {
                const permissionError = new FirestorePermissionError({
                    path: collectionRef.path,
                    operation: 'create',
                    requestResourceData: incidentData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddIncident)} className="space-y-4">
                 {!student && (
                     <FormField control={form.control} name="studentId" render={({ field }) => (
                        <FormItem><FormLabel>Élève concerné</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger></FormControl><SelectContent>{students.map(s => (<SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                     )}/>
                 )}
                 <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Type d'incident/sanction</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Avertissement Oral">Avertissement Oral</SelectItem><SelectItem value="Avertissement Écrit">Avertissement Écrit</SelectItem><SelectItem value="Retenue">Retenue</SelectItem><SelectItem value="Mise à pied">Mise à pied</SelectItem><SelectItem value="Exclusion temporaire">Exclusion temporaire</SelectItem><SelectItem value="Exclusion définitive">Exclusion définitive</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                 )}/>
                 <FormField control={form.control} name="reason" render={({ field }) => (
                     <FormItem><FormLabel>Raison / Description</FormLabel><FormControl><Textarea placeholder="Décrivez l'incident..." {...field} /></FormControl><FormMessage /></FormItem>
                 )}/>
                 <FormField control={form.control} name="actionsTaken" render={({ field }) => (
                     <FormItem><FormLabel>Actions prises (optionnel)</FormLabel><FormControl><Input placeholder="Ex: Devoir supplémentaire..." {...field} /></FormControl></FormItem>
                 )}/>
                 <FormField control={form.control} name="parentNotified" render={({ field }) => (
                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Parents notifiés ?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                 )}/>

                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={onSave}>Annuler</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>Enregistrer</Button>
                 </DialogFooter>
            </form>
        </Form>
    );
}
