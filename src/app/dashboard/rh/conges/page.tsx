
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
import { MoreHorizontal, PlusCircle, Check, X, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, setDoc, deleteDoc, doc, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { staff_leave as StaffLeave, staff as Staff } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LeaveRequestForm } from '@/components/rh/leave-request-form';

// Main Page Component
export default function StaffLeavesPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const canManage = !!user?.profile?.permissions?.manageUsers;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leaveToDelete, setLeaveToDelete] = useState<(StaffLeave & { id: string }) | null>(null);

  // Fetch all staff members if user is an admin
  const staffQuery = useMemo(() => {
    if (!schoolId || !canManage) return null;
    return query(collection(firestore, `ecoles/${schoolId}/personnel`));
  }, [firestore, schoolId, canManage]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staffMembers = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [staffData]);


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

  const isLoading = schoolLoading || userLoading || leavesLoading || staffLoading;

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
            {user && (
                <LeaveRequestForm
                    schoolId={schoolId!}
                    staffMembers={staffMembers}
                    currentUser={{ 
                        uid: user.uid!, 
                        displayName: user.displayName, 
                        email: user.email, 
                        canManage 
                    }}
                    onSave={() => setIsFormOpen(false)}
                />
            )}
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
