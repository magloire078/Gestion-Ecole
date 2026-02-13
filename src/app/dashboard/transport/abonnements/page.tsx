
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import type { transportSubscription as TransportSubscription, student as Student, route as Route } from '@/lib/data-types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { SubscriptionForm } from '@/components/transport/subscription-form';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionWithDetails extends TransportSubscription {
    studentName?: string;
    routeName?: string;
}

export default function TransportSubscriptionsPage() {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const canManageContent = !!user?.profile?.permissions?.manageTransport;
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<(TransportSubscription & { id: string }) | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState<(TransportSubscription & { id: string }) | null>(null);

    const subscriptionsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_abonnements`)) : null, [firestore, schoolId]);
    const { data: subscriptionsData, loading: subscriptionsLoading } = useCollection(subscriptionsQuery);

    const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
    
    const students = useMemo(() => studentsData?.map(doc => ({ id: doc.id, ...doc.data() } as Student & { id: string })) || [], [studentsData]);

    const routesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_lignes`)) : null, [firestore, schoolId]);
    const { data: routesData, loading: routesLoading } = useCollection(routesQuery);
    
    const routes = useMemo(() => routesData?.map(doc => ({ id: doc.id, ...doc.data() } as Route & { id: string })) || [], [routesData]);

    const subscriptions: (SubscriptionWithDetails & {id: string})[] = useMemo(() => {
        if (!subscriptionsData || !studentsData || !routesData) return [];
        const studentsMap = new Map(studentsData.map(doc => [doc.id, doc.data() as Student]));
        const routesMap = new Map(routesData.map(doc => [doc.id, doc.data() as Route]));

        return subscriptionsData.map(doc => {
            const sub = { id: doc.id, ...doc.data() } as TransportSubscription & { id: string };
            const student = studentsMap.get(sub.studentId);
            const route = routesMap.get(sub.routeId);
            return {
                ...sub,
                studentName: student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu',
                routeName: route ? route.name : 'Ligne inconnue',
            };
        });
    }, [subscriptionsData, studentsData, routesData]);
    
    const isLoading = schoolLoading || subscriptionsLoading || studentsLoading || routesLoading;
    
    const handleOpenForm = (subscription: (TransportSubscription & { id: string }) | null) => {
        setEditingSubscription(subscription);
        setIsFormOpen(true);
    };

    const handleFormSave = () => {
        setIsFormOpen(false);
        setEditingSubscription(null);
    };
    
    const handleOpenDeleteDialog = (subscription: (TransportSubscription & { id: string })) => {
        setSubscriptionToDelete(subscription);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteSubscription = async () => {
        if (!schoolId || !subscriptionToDelete) return;
        try {
            await deleteDoc(doc(firestore, `ecoles/${schoolId}/transport_abonnements`, subscriptionToDelete.id));
            toast({ title: 'Abonnement supprimé', description: "L'abonnement a bien été supprimé." });
        } catch (e) {
            console.error("Error deleting subscription:", e);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer l\'abonnement.' });
        } finally {
            setIsDeleteDialogOpen(false);
            setSubscriptionToDelete(null);
        }
    }

    const getStatusBadgeVariant = (status: string) => {
        switch(status) {
            case 'active': return 'secondary';
            case 'inactive': return 'outline';
            default: return 'default';
        }
    };

    const getPaymentBadgeVariant = (status?: string) => {
        switch(status) {
            case 'paid': return 'secondary';
            case 'unpaid': return 'destructive';
            default: return 'outline';
        }
    };

  return (
    <>
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Abonnements au Transport</CardTitle>
                  <CardDescription>
                    Gérez les abonnements des élèves au service de transport scolaire.
                  </CardDescription>
                </div>
                {canManageContent && (
                    <Button onClick={() => handleOpenForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter un abonnement
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Élève</TableHead><TableHead>Ligne</TableHead><TableHead>Période</TableHead><TableHead>Statut</TableHead><TableHead>Paiement</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : subscriptions.length > 0 ? (
                subscriptions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.studentName}</TableCell>
                    <TableCell>{sub.routeName}</TableCell>
                    <TableCell className="capitalize">{sub.period}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(sub.status)}>{sub.status}</Badge></TableCell>
                    <TableCell><Badge variant={getPaymentBadgeVariant(sub.paymentStatus)}>{sub.paymentStatus || 'N/A'}</Badge></TableCell>
                    <TableCell className="text-right">
                       {canManageContent && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenForm(sub)}><Edit className="mr-2 h-4 w-4"/>Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(sub)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun abonnement trouvé.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingSubscription ? "Modifier l'abonnement" : "Nouvel Abonnement"}</DialogTitle>
                <DialogDescription>Renseignez les informations de l'abonnement au transport.</DialogDescription>
            </DialogHeader>
            <SubscriptionForm 
                schoolId={schoolId!}
                students={students}
                routes={routes}
                subscription={editingSubscription}
                onSave={handleFormSave}
            />
        </DialogContent>
    </Dialog>
    
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. L'abonnement sera définitivement supprimé.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSubscription} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

