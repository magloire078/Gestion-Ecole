

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from "@/components/ui/alert-dialog";
import { PlusCircle, Search, LayoutGrid, List } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { useToast } from '@/hooks/use-toast';
import type { materiel as Materiel, salle as Salle, bus as Bus, building } from '@/lib/data-types';
import { MaterielForm } from '@/components/immobilier/materiel-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryGrid } from '@/components/immobilier/inventory-grid';
import { InventoryTable } from '@/components/immobilier/inventory-table';
import { cn } from '@/lib/utils';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      const salle = { id: doc.id, ...doc.data() } as Salle & { id: string };
      const value = `salle:${salle.id}`;
      const label = `Salle: ${salle.name}`;
      options.push({ value, label });
      map.set(value, label);
    });
    (batimentsData || []).forEach(doc => {
      const batiment = { id: doc.id, ...doc.data() } as building & { id: string };
      const value = `batiment:${batiment.id}`;
      const label = `Bâtiment: ${batiment.name}`;
      options.push({ value, label });
      map.set(value, label);
    });
    (busesData || []).forEach(doc => {
      const bus = { id: doc.id, ...doc.data() } as Bus & { id: string };
      const value = `bus:${bus.id}`;
      const label = `Bus: ${bus.registrationNumber}`;
      options.push({ value, label });
      map.set(value, label);
    });

    return { locationOptions: options, locationMap: map };
  }, [sallesData, batimentsData, busesData]);

  const filteredInventaire = useMemo(() => {
    return inventaire.filter(item => {
      const searchMatch = searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
      const statusMatch = selectedStatus === 'all' || item.status === selectedStatus;
      return searchMatch && categoryMatch && statusMatch;
    });
  }, [inventaire, searchTerm, selectedCategory, selectedStatus]);

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

  const isLoading = schoolLoading || inventaireLoading || sallesLoading || batimentsLoading || busesLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par nom..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Catégorie..." /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les catégories</SelectItem><SelectItem value="Mobilier">Mobilier</SelectItem><SelectItem value="Informatique">Informatique</SelectItem><SelectItem value="Pédagogique">Pédagogique</SelectItem><SelectItem value="Sportif">Sportif</SelectItem><SelectItem value="Autre">Autre</SelectItem></SelectContent></Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Statut..." /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="neuf">Neuf</SelectItem><SelectItem value="bon">Bon</SelectItem><SelectItem value="à réparer">À réparer</SelectItem><SelectItem value="hors_service">Hors service</SelectItem></SelectContent></Select>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className={cn(viewMode === 'list' && 'bg-accent')}><List className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={cn(viewMode === 'grid' && 'bg-accent')}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'grid' ? (
            <InventoryGrid items={filteredInventaire} isLoading={isLoading} onEdit={(item) => { setEditingMateriel(item); setIsFormOpen(true); }} onDelete={handleOpenDeleteDialog} locationMap={locationMap} />
          ) : (
            <InventoryTable items={filteredInventaire} isLoading={isLoading} onEdit={(item) => { setEditingMateriel(item); setIsFormOpen(true); }} onDelete={handleOpenDeleteDialog} locationMap={locationMap} />
          )}
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
              Cette action est irréversible. L&apos;équipement <strong>{materielToDelete?.name}</strong> sera définitivement supprimé.
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

