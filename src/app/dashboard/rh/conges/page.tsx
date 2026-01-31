'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { staff_leave as StaffLeave, staff as Staff } from '@/lib/data-types';
import { LeaveRequestForm } from '@/components/rh/leave-request-form';

type LeaveWithId = StaffLeave & { id: string };

export default function LeaveManagementPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const canManage = !!user?.profile?.permissions?.manageUsers;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<{
    leave: LeaveWithId;
    newStatus: 'Approuvé' | 'Rejeté';
  } | null>(null);

  const leavesQuery = useMemo(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/conges_personnel`), orderBy('requestedAt', 'desc')) : null, 
  [firestore, schoolId]);

  const { data: leavesData, loading: leavesLoading } = useCollection(leavesQuery);
  
  const staffQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);

  const staffMembers = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as Staff & {id: string})) || [], [staffData]);

  const leaves = useMemo(() => {
    const allLeaves = leavesData?.map(d => ({ id: d.id, ...d.data() } as LeaveWithId)) || [];
    if (canManage) {
        return allLeaves;
    }
    return allLeaves.filter(leave => leave.staffId === user?.uid);
  }, [leavesData, canManage, user?.uid]);

  const handleOpenConfirmDialog = (leave: LeaveWithId, newStatus: 'Approuvé' | 'Rejeté') => {
    setActionToConfirm({ leave, newStatus });
    setIsConfirmDialogOpen(true);
  };
  
  const handleUpdateStatus = async () => {
    if (!schoolId || !actionToConfirm || !user?.uid) return;

    const { leave, newStatus } = actionToConfirm;
    const leaveRef = doc(firestore, `ecoles/${schoolId}/conges_personnel`, leave.id);
    
    try {
      await updateDoc(leaveRef, {
        status: newStatus,
        reviewedBy: user.uid,
        reviewDate: serverTimestamp(),
      });
      toast({ title: 'Statut mis à jour', description: `La demande de ${leave.staffName} a été marquée comme "${newStatus}".` });
    } catch (e) {
      console.error("Error updating leave status:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le statut.' });
    } finally {
      setIsConfirmDialogOpen(false);
      setActionToConfirm(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approuvé': return 'secondary';
      case 'Rejeté': return 'destructive';
      case 'En attente': return 'outline';
      default: return 'default';
    }
  };

  const isLoading = schoolLoading || userLoading || leavesLoading || staffLoading;

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion des Congés & Absences</CardTitle>
              <CardDescription>Suivez et gérez les demandes de congé du personnel.</CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Demande
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Statut</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={canManage ? 6 : 5}><Skeleton className="h-5 w-full"/></TableCell></TableRow>)
            ) : leaves.length > 0 ? (
                leaves.map(leave => (
                    <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.staffName}</TableCell>
                        <TableCell>{leave.type}</TableCell>
                        <TableCell>{format(new Date(leave.startDate), 'dd/MM/yy')} - {format(new Date(leave.endDate), 'dd/MM/yy')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{leave.reason}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(leave.status)}>{leave.status}</Badge></TableCell>
                        {canManage && (
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => handleOpenConfirmDialog(leave, 'Approuvé')}><CheckCircle className="mr-2 h-4 w-4 text-green-600"/>Approuver</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenConfirmDialog(leave, 'Rejeté')}><XCircle className="mr-2 h-4 w-4 text-red-600"/>Rejeter</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        )}
                    </TableRow>
                ))
            ) : (
                 <TableRow><TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center">Aucune demande de congé trouvée.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Nouvelle demande de congé</DialogTitle>
                <DialogDescription>
                    {canManage ? "Enregistrez un congé pour un membre du personnel." : "Remplissez les informations pour votre demande de congé."}
                </DialogDescription>
            </DialogHeader>
            <LeaveRequestForm
                schoolId={schoolId!}
                staffMembers={staffMembers}
                currentUser={{ uid: user!.uid, displayName: user!.displayName, email: user!.email, canManage: canManage }}
                onSave={() => setIsFormOpen(false)}
            />
        </DialogContent>
    </Dialog>

    <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
                <AlertDialogDescription>
                    Êtes-vous sûr de vouloir <strong>{actionToConfirm?.newStatus === "Approuvé" ? "approuver" : "rejeter"}</strong> cette demande de congé ?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleUpdateStatus}>Confirmer</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
