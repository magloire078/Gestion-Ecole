
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc, where } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { bus as Bus, staff as Staff } from '@/lib/data-types';
import { BusForm } from '@/components/transport/bus-form';

export default function BusManagementPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageTransport;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<(Bus & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [busToDelete, setBusToDelete] = useState<(Bus & { id: string }) | null>(null);

  const busesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_bus`)) : null, [firestore, schoolId]);
  const { data: busesData, loading: busesLoading } = useCollection(busesQuery);
  const buses: (Bus & { id: string })[] = useMemo(() => busesData?.map(d => ({ id: d.id, ...d.data() } as Bus & { id: string })) || [], [busesData]);

  const driversQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'chauffeur')) : null, [firestore, schoolId]);
  const { data: driversData, loading: driversLoading } = useCollection(driversQuery);
  const drivers: (Staff & { id: string })[] = useMemo(() => driversData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [driversData]);

  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, `${d.firstName} ${d.lastName}`])), [drivers]);
  
  const handleOpenDeleteDialog = (bus: Bus & { id: string }) => {
    setBusToDelete(bus);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteBus = async () => {
    if (!schoolId || !busToDelete) return;
    try {
      await deleteDoc(doc(firestore, `ecoles/${schoolId}/transport_bus`, busToDelete.id));
      toast({ title: "Bus supprimé", description: `Le bus ${busToDelete.registrationNumber} a été supprimé.` });
    } catch (error) {
       console.error("Error deleting bus:", error);
       toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le bus.' });
    } finally {
        setIsDeleteDialogOpen(false);
        setBusToDelete(null);
    }
  };


  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
        case 'active': return 'secondary';
        case 'maintenance': return 'outline';
        case 'inactive': return 'destructive';
        default: return 'default';
    }
  };
  
  const isLoading = schoolLoading || busesLoading || driversLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion de la Flotte de Bus</CardTitle>
              <CardDescription>Gérez les véhicules de transport scolaire.</CardDescription>
            </div>
            {canManageContent && (
              <Button onClick={() => { setEditingBus(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un bus
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Immatriculation</TableHead><TableHead>Type</TableHead><TableHead>Capacité</TableHead><TableHead>Chauffeur</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : buses.length > 0 ? (
                buses.map(bus => (
                  <TableRow key={bus.id}>
                    <TableCell className="font-mono">{bus.registrationNumber}</TableCell>
                    <TableCell className="capitalize">{bus.type}</TableCell>
                    <TableCell>{bus.capacity}</TableCell>
                    <TableCell>{bus.driverId ? driverMap.get(bus.driverId) || 'N/A' : 'Non assigné'}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(bus.status)}>{bus.status}</Badge></TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingBus(bus); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(bus)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun bus enregistré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBus ? 'Modifier le bus' : 'Ajouter un nouveau bus'}</DialogTitle>
          </DialogHeader>
          <BusForm 
            schoolId={schoolId!}
            drivers={drivers}
            bus={editingBus}
            onSave={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce bus ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le bus avec l'immatriculation <strong>{busToDelete?.registrationNumber}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBus} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
