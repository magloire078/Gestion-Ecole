

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { discipline_incident as DisciplineIncident } from '@/lib/data-types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface DisciplineTabProps {
    schoolId: string;
    studentId: string;
}

const incidentSchema = z.object({
  type: z.enum(["Avertissement Oral", "Avertissement Écrit", "Retenue", "Mise à pied", "Exclusion temporaire", "Exclusion définitive"]),
  reason: z.string().min(5, "La raison doit être plus détaillée."),
  actionsTaken: z.string().optional(),
  parentNotified: z.boolean().default(false),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

export function DisciplineTab({ schoolId, studentId }: DisciplineTabProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const canManageDiscipline = !!user?.profile?.permissions?.manageDiscipline;

    const [isFormOpen, setIsFormOpen] = useState(false);

    const incidentsQuery = useMemoFirebase(() => 
        query(
            collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/incidents_disciplinaires`), 
            orderBy('date', 'desc')
        ), 
    [firestore, schoolId, studentId]);
    
    const { data: incidentsData, loading: incidentsLoading } = useCollection(incidentsQuery);
    
    const incidents = useMemo(() => incidentsData?.map(d => ({ id: d.id, ...d.data() } as DisciplineIncident & {id: string})) || [], [incidentsData]);

    const form = useForm<IncidentFormValues>({
        resolver: zodResolver(incidentSchema),
        defaultValues: {
            type: 'Avertissement Oral',
            reason: '',
            actionsTaken: '',
            parentNotified: false,
        }
    });

    const handleAddIncident = async (values: IncidentFormValues) => {
        if (!user || !user.authUser) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté pour effectuer cette action.' });
            return;
        }

        const incidentData = {
            ...values,
            studentId,
            date: new Date().toISOString(),
            reportedById: user.authUser.uid,
            reportedByName: user.authUser.displayName || 'Système',
            followUpNotes: '',
        };

        const collectionRef = collection(firestore, `ecoles/${schoolId}/eleves/${studentId}/incidents_disciplinaires`);
        addDoc(collectionRef, incidentData)
            .then(() => {
                toast({ title: 'Incident enregistré', description: "Le nouvel incident disciplinaire a été ajouté." });
                setIsFormOpen(false);
                form.reset();
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

    const getTypeBadgeVariant = (type: string) => {
        if (type.includes('Exclusion') || type.includes('Mise à pied')) return 'destructive';
        if (type.includes('Retenue') || type.includes('Écrit')) return 'outline';
        return 'secondary';
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Historique Disciplinaire</CardTitle>
                            <CardDescription>Suivi des comportements et des sanctions de l'élève.</CardDescription>
                        </div>
                        {canManageDiscipline && (
                            <Button onClick={() => setIsFormOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Signaler un incident
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Raison</TableHead>
                                <TableHead>Signalé par</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {incidentsLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : incidents.length > 0 ? (
                                incidents.map(incident => (
                                    <TableRow key={incident.id}>
                                        <TableCell>{format(new Date(incident.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                                        <TableCell><Badge variant={getTypeBadgeVariant(incident.type)}>{incident.type}</Badge></TableCell>
                                        <TableCell>{incident.reason}</TableCell>
                                        <TableCell>{incident.reportedByName}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">Aucun incident disciplinaire enregistré.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Signaler un nouvel incident</DialogTitle>
                        <DialogDescription>Remplissez les détails de l'incident. Ces informations seront ajoutées au dossier de l'élève.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleAddIncident)} className="space-y-4">
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
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>Enregistrer</Button>
                             </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
