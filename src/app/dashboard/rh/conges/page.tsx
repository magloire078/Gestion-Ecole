'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Check, X, Loader2, CalendarClock, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, addDoc, setDoc, deleteDoc, doc, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { staff_leave as StaffLeave, staff as Staff } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Schema for the form
const leaveSchema = z.object({
  type: z.enum(["Congé Annuel", "Congé Maladie", "Congé Maternité/Paternité", "Permission Spéciale", "Absence Non Justifiée"]),
  startDate: z.string().min(1, "La date de début est requise."),
  endDate: z.string().min(1, "La date de fin est requise."),
  reason: z.string().min(5, "Un motif est requis."),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
    message: "La date de fin doit être après la date de début.",
    path: ["endDate"],
});
type LeaveFormValues = z.infer<typeof leaveSchema>;

// Main Page Component
export default function StaffLeavesPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const canManage = !!user?.profile?.permissions?.manageUsers;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<(StaffLeave & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState<(StaffLeave & { id: string }) | null>(null);

  const leavesQuery = useMemo(() => {
    if (!schoolId) return null;
    const baseQuery = collection(firestore, `ecoles/${schoolId}/conges_personnel`);
    if (canManage) {
        return query(baseQuery, orderBy('requestedAt', 'desc'));
    }
    if (user?.uid) {
        return query(baseQuery, where('staffId', '==', user.uid), orderBy('requestedAt', 'desc'));
    }
    return null;
  }, [firestore, schoolId, user?.uid, canManage]);
  
  const { data: leavesData, loading: leavesLoading } = useCollection(leavesQuery);
  const leaves = useMemo(() => leavesData?.map(d => ({ id: d.id, ...d.data() } as StaffLeave & { id: string })) || [], [leavesData]);

  const form = useForm<LeaveFormValues>({
      resolver: zodResolver(leaveSchema),
      defaultValues: { type: 'Congé Annuel', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), reason: '' }
  });

  const handleStatusUpdate = async (leaveId: string, newStatus: 'Approuvé' | 'Rejeté') => {
    if (!schoolId || !user) return;
    const leaveRef = doc(firestore, `ecoles/${schoolId}/conges_personnel`, leaveId);
    try {
        await setDoc(leaveRef, { 
            status: newStatus,
            reviewedBy: user.uid,
            reviewDate: serverTimestamp(),
        }, { merge: true });
        toast({ title: "Statut mis à jour" });
    } catch(e) {
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour le statut." });
    }
  };

  const handleFormSubmit = async (values: LeaveFormValues) => {
    if (!schoolId || !user) return;

    const dataToSave = {
        ...values,
        schoolId,
        staffId: user.uid,
        staffName: user.displayName || user.email,
        status: 'En attente',
        requestedAt: serverTimestamp(),
    };
    
    try {
        await addDoc(collection(firestore, `ecoles/${schoolId}/conges_personnel`), dataToSave);
        toast({ title: 'Demande envoyée' });
        setIsFormOpen(false);
        form.reset();
    } catch(e) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'envoyer la demande.' });
    }
  };
  
  const handleOpenDeleteDialog = (leave: StaffLeave & { id: string }) => {
    setLeaveToDelete(leave);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteLeave = async () => {
    if (!schoolId || !leaveToDelete) return;
    try {
      await deleteDoc(doc(firestore, `ecoles/${schoolId}/conges_personnel`, leaveToDelete.id));
      toast({ title: 'Demande supprimée' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer la demande.' });
    } finally {
      setIsDeleteDialogOpen(false);
      setLeaveToDelete(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'Approuvé': return 'secondary';
        case 'Rejeté': return 'destructive';
        case 'En attente': return 'outline';
        default: return 'default';
    }
  }

  const isLoading = schoolLoading || userLoading || leavesLoading;

  return (
    <>
    <div className="space-y-6">
      <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Congés & Absences du Personnel</CardTitle>
                <CardDescription>Suivez les demandes de congé de l'équipe.</CardDescription>
              </div>
              <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Demande
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Personnel</TableHead><TableHead>Type</TableHead><TableHead>Période</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? (
                    [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
                ) : leaves.map(leave => (
                    <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.staffName}</TableCell>
                        <TableCell>{leave.type}</TableCell>
                        <TableCell>{format(new Date(leave.startDate), 'dd/MM/yy')} - {format(new Date(leave.endDate), 'dd/MM/yy')}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(leave.status)}>{leave.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {canManage && (
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {leave.status === 'En attente' && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleStatusUpdate(leave.id, 'Approuvé')}><Check className="mr-2 h-4 w-4"/>Approuver</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusUpdate(leave.id, 'Rejeté')}><X className="mr-2 h-4 w-4"/>Rejeter</DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(leave)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          )}
                        </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isLoading && leaves.length === 0 && <p className="text-center text-muted-foreground p-8">Aucune demande de congé pour le moment.</p>}
          </CardContent>
      </Card>
    </div>
    
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Demande de Congé</DialogTitle>
                <DialogDescription>Remplissez les détails de votre demande.</DialogDescription>
            </DialogHeader>
             <Form {...form}>
                <form id="leave-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Congé Annuel">Congé Annuel</SelectItem><SelectItem value="Congé Maladie">Congé Maladie</SelectItem><SelectItem value="Congé Maternité/Paternité">Congé Maternité/Paternité</SelectItem><SelectItem value="Permission Spéciale">Permission Spéciale</SelectItem><SelectItem value="Absence Non Justifiée">Absence Non Justifiée</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>Date de début</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem><FormLabel>Date de fin</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                     <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>Motif</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </form>
            </Form>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button type="submit" form="leave-form" disabled={form.formState.isSubmitting}>Soumettre la demande</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

     <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprimera la demande de congé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLeave} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
