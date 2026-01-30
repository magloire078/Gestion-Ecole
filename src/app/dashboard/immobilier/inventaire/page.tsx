'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { MoreHorizontal, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { materiel as Materiel, salle as Salle, bus as Bus, building } from '@/lib/data-types';
import { MaterielForm } from '@/components/immobilier/materiel-form';

export default function InventairePage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageInventory;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMateriel, setEditingMateriel] = useState<(Materiel & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [materielToDelete, setMaterielToDelete] = useState<(Materiel & { id: string }) | null>(null);

  const inventaireQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/inventaire`)) : null, [firestore, schoolId]);
  const { data: inventaireData, loading: inventaireLoading } = useCollection(inventaireQuery);
  const inventaire: (Materiel & { id: string })[] = useMemo(() => inventaireData?.map(d => ({ id: d.id, ...d.data() } as Materiel & { id: string })) || [], [inventaireData]);

  // Fetch all possible locations
  const sallesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/salles`)) : null, [firestore, schoolId]);
  const batimentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/batiments`)) : null, [firestore, schoolId]);
  const busesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_bus`)) : null, [firestore, schoolId]);
  
  const { data: sallesData, loading: sallesLoading } = useCollection(sallesQuery);
  const { data: batimentsData, loading: batimentsLoading } = useCollection(batimentsQuery);
  const { data: busesData, loading: busesLoading } = useCollection(busesQuery);

  const { locationOptions, locationMap } = useMemo(() => {
      const options: { value: string, label: string }[] = [];
      const map = new Map<string, string>();
      
      (sallesData || []).forEach(doc => {
          const salle = { id: doc.id, ...doc.data() } as Salle & {id: string};
          const value = `salle:${salle.id}`;
          const label = `Salle: ${salle.name}`;
          options.push({ value, label });
          map.set(value, label);
      });
      (batimentsData || []).forEach(doc => {
          const batiment = { id: doc.id, ...doc.data() } as building & {id: string};
          const value = `batiment:${batiment.id}`;
          const label = `Bâtiment: ${batiment.name}`;
          options.push({ value, label });
          map.set(value, label);
      });
      (busesData || []).forEach(doc => {
          const bus = { id: doc.id, ...doc.data() } as Bus & {id: string};
          const value = `bus:${bus.id}`;
          const label = `Bus: ${bus.registrationNumber}`;
          options.push({ value, label });
          map.set(value, label);
      });

      return { locationOptions: options, locationMap: map };
  }, [sallesData, batimentsData, busesData]);

  const handleOpenDeleteDialog = (materiel: Materiel & { id: string }) => {
    setMaterielToDelete(materiel);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteMateriel = async () => {
    if (!schoolId || !materielToDelete) return;
    try {
      const docRef = doc(firestore, `ecoles/${schoolId}/inventaire`, materielToDelete.id);
      await deleteDoc(docRef);
      toast({ title: "Équipement supprimé", description: `L'équipement ${materielToDelete.name} a été retiré de l'inventaire.` });
    } catch (e) {
      console.error("Error deleting equipment:", e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer l\'équipement.' });
    } finally {
        setIsDeleteDialogOpen(false);
        setMaterielToDelete(null);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch(status) {
        case 'neuf': return 'default';
        case 'bon': return 'secondary';
        case 'à réparer': return 'outline';
        case 'hors_service': return 'destructive';
        default: return 'default';
    }
  };
  
  const isLoading = schoolLoading || inventaireLoading || sallesLoading || batimentsLoading || busesLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Inventaire du Matériel</CardTitle>
              <CardDescription>Gérez le matériel et les équipements de votre établissement.</CardDescription>
            </div>
            {canManageContent && (
              <Button onClick={() => { setEditingMateriel(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter du matériel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Catégorie</TableHead><TableHead>Quantité</TableHead><TableHead>Emplacement</TableHead><TableHead>Statut</TableHead>{canManageContent && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : inventaire.length > 0 ? (
                inventaire.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{locationMap.get(item.locationId) || item.locationId}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(item.status)} className="capitalize">{item.status.replace(/_/g, ' ')}</Badge></TableCell>
                    {canManageContent && (
                        <TableCell className="text-right">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditingMateriel(item); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(item)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                       </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun matériel enregistré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMateriel ? 'Modifier' : 'Ajouter'} un équipement</DialogTitle>
          </DialogHeader>
          <MaterielForm
            key={editingMateriel?.id || 'new'}
            schoolId={schoolId!}
            materiel={editingMateriel}
            locationOptions={locationOptions}
            onSave={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet équipement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'équipement <strong>{materielToDelete?.name}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMateriel} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
