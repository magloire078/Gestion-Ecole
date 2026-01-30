'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { tache_maintenance as TacheMaintenance, staff, salle as Salle, bus as Bus } from '@/lib/data-types';
import { format } from 'date-fns';
import { MaintenanceForm } from './maintenance-form';

interface MaintenanceListProps {
  schoolId: string;
  limit?: number;
}

export function MaintenanceList({ schoolId, limit }: MaintenanceListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageInventory;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTache, setEditingTache] = useState<(TacheMaintenance & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tacheToDelete, setTacheToDelete] = useState<(TacheMaintenance & { id: string }) | null>(null);

  const tachesQuery = useMemo(() => {
    const baseQuery = query(collection(firestore, `ecoles/${schoolId}/maintenance`), orderBy('createdAt', 'desc'));
    return limit ? query(baseQuery, firestoreLimit(limit)) : baseQuery;
  }, [firestore, schoolId, limit]);

  const { data: tachesData, loading: tachesLoading } = useCollection(tachesQuery);
  const taches: (TacheMaintenance & { id: string })[] = useMemo(() => tachesData?.map(d => ({ id: d.id, ...d.data() } as TacheMaintenance & { id: string })) || [], [tachesData]);
  
  const staffQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);
  const staffMembers: (staff & { id: string })[] = useMemo(() => staffData?.map(d => ({ id: d.id, ...d.data() } as staff & { id: string })) || [], [staffData]);
  const staffMap = useMemo(() => new Map(staffMembers.map(s => [s.id, `${s.firstName} ${s.lastName}`])), [staffMembers]);

  const sallesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/salles`)) : null, [firestore, schoolId]);
  const busesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_bus`)) : null, [firestore, schoolId]);
  const { data: sallesData, loading: sallesLoading } = useCollection(sallesQuery);
  const { data: busesData, loading: busesLoading } = useCollection(busesQuery);

  const salles = useMemo(() => sallesData?.map(d => ({ id: d.id, ...d.data() } as Salle & { id: string })) || [], [sallesData]);
  const buses = useMemo(() => busesData?.map(d => ({ id: d.id, ...d.data() } as Bus & { id: string })) || [], [busesData]);

  const locationOptions = useMemo(() => {
    const salleOptions = salles.map(s => ({ value: `salle:${s.id}`, label: `Salle: ${s.name}` }));
    const busOptions = buses.map(b => ({ value: `bus:${b.id}`, label: `Bus: ${b.registrationNumber}` }));
    return [...salleOptions, ...busOptions];
  }, [salles, buses]);

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    salles.forEach(s => map.set(`salle:${s.id}`, `Salle: ${s.name}`));
    buses.forEach(b => map.set(`bus:${b.id}`, `Bus: ${b.registrationNumber}`));
    return map;
  }, [salles, buses]);

  const handleOpenDeleteDialog = (tache: TacheMaintenance & { id: string }) => {
    setTacheToDelete(tache);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteTache = async () => {
    if (!schoolId || !tacheToDelete) return;
    try {
      await deleteDoc(doc(firestore, `ecoles/${schoolId}/maintenance`, tacheToDelete.id));
      toast({ title: "Tâche supprimée", description: `La tâche "${tacheToDelete.title}" a été supprimée.` });
    } catch (error) {
       console.error("Error deleting maintenance task:", error);
       toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la tâche." });
    } finally {
        setIsDeleteDialogOpen(false);
        setTacheToDelete(null);
    }
  };
  
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch(status) {
        case 'à_faire': return 'outline';
        case 'en_cours': return 'secondary';
        case 'terminée': return 'default';
        default: return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch(priority) {
        case 'basse': return 'default';
        case 'moyenne': return 'secondary';
        case 'haute': return 'destructive';
        default: return 'default';
    }
  };
  
  const isLoading = tachesLoading || staffLoading || sallesLoading || busesLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Suivi de la Maintenance</CardTitle>
              <CardDescription>Gérez les tâches de maintenance préventive et corrective.</CardDescription>
            </div>
            {canManageContent && !limit && (
              <Button onClick={() => { setEditingTache(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Tâche
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Priorité</TableHead><TableHead>Statut</TableHead><TableHead>Assigné à</TableHead><TableHead>Emplacement</TableHead><TableHead>Échéance</TableHead>{!limit && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(limit || 5)].map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : taches.length > 0 ? (
                taches.map(tache => (
                  <TableRow key={tache.id}>
                    <TableCell className="font-medium">{tache.title}</TableCell>
                    <TableCell><Badge variant={getPriorityBadgeVariant(tache.priority)} className="capitalize">{tache.priority}</Badge></TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(tache.status)} className="capitalize">{tache.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>{tache.assignedTo ? staffMap.get(tache.assignedTo) || 'N/A' : 'Non assigné'}</TableCell>
                    <TableCell>{tache.location ? (locationMap.get(tache.location) || tache.location) : 'N/A'}</TableCell>
                    <TableCell>{tache.dueDate ? format(new Date(tache.dueDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    {!limit && canManageContent && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingTache(tache); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(tache)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">Aucune tâche de maintenance pour le moment.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTache ? 'Modifier la' : 'Nouvelle'} tâche de maintenance</DialogTitle>
          </DialogHeader>
          <MaintenanceForm 
            key={editingTache?.id || 'new'}
            schoolId={schoolId}
            tache={editingTache}
            staffMembers={staffMembers}
            locationOptions={locationOptions}
            onSave={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La tâche <strong>{tacheToDelete?.title}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTache} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
