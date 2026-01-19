'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc } from 'firebase/firestore';
import type { building, salle as Salle } from '@/lib/data-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DoorOpen, PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SalleForm } from './salle-form';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import Link from 'next/link';

export function SalleManagement({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageRooms;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSalle, setEditingSalle] = useState<(Salle & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [salleToDelete, setSalleToDelete] = useState<(Salle & { id: string }) | null>(null);

  const buildingsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/batiments`)), [firestore, schoolId]);
  const sallesQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/salles`)), [firestore, schoolId]);

  const { data: buildingsData, loading: buildingsLoading } = useCollection(buildingsQuery);
  const { data: sallesData, loading: sallesLoading } = useCollection(sallesQuery);
  
  const buildings = useMemo(() => buildingsData?.map(doc => ({ id: doc.id, ...doc.data() } as building & {id: string})) || [], [buildingsData]);
  const salles = useMemo(() => sallesData?.map(doc => ({ id: doc.id, ...doc.data() } as Salle & {id: string})) || [], [sallesData]);

  const sallesByBuilding = useMemo(() => {
    const grouped: Record<string, (Salle & {id: string})[]> = {};
    for (const salle of salles) {
        if (!salle.buildingId) continue;
        if (!grouped[salle.buildingId]) {
            grouped[salle.buildingId] = [];
        }
        grouped[salle.buildingId].push(salle);
    }
    return grouped;
  }, [salles]);

  const isLoading = buildingsLoading || sallesLoading;

  const handleOpenForm = (salle: (Salle & { id: string }) | null) => {
      setEditingSalle(salle);
      setIsFormOpen(true);
  }
  
  const handleFormSave = () => {
      setIsFormOpen(false);
      setEditingSalle(null);
  }
  
  const handleOpenDeleteDialog = (salle: Salle & { id: string }) => {
    setSalleToDelete(salle);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteSalle = async () => {
    if (!schoolId || !salleToDelete) return;
    const docRef = doc(firestore, `ecoles/${schoolId}/salles`, salleToDelete.id);
    deleteDoc(docRef)
    .then(() => {
        toast({ title: 'Salle supprimée' });
    }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete'}));
    }).finally(() => {
        setIsDeleteDialogOpen(false);
    })
  }
  
  if(isLoading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
          </div>
      )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Gestion des Salles</CardTitle>
                <CardDescription>Visualisez et gérez les salles de chaque bâtiment.</CardDescription>
            </div>
            {canManageContent && (
                <Button size="sm" onClick={() => handleOpenForm(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter une salle
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {buildings.length > 0 ? (
            <Accordion type="multiple" defaultValue={buildings.map(b => b.id)}>
                {buildings.map(building => (
                    <AccordionItem value={building.id} key={building.id}>
                        <AccordionTrigger className="font-semibold text-lg">{building.name}</AccordionTrigger>
                        <AccordionContent>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                                {(sallesByBuilding[building.id] || []).map(salle => (
                                    <div key={salle.id} className="p-4 border rounded-lg space-y-2 relative group">
                                        <div className="font-bold flex items-center gap-2"><DoorOpen className="h-4 w-4" />{salle.name}</div>
                                        <div className="text-sm text-muted-foreground capitalize">Type: {salle.type.replace(/_/g, ' ')}</div>
                                        <div className="text-sm text-muted-foreground">Capacité: {salle.capacity} personnes</div>
                                         {canManageContent && (
                                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => handleOpenForm(salle)}><Edit className="mr-2 h-4 w-4"/>Modifier</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(salle)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                         )}
                                    </div>
                                ))}
                                {(!sallesByBuilding[building.id] || sallesByBuilding[building.id].length === 0) && (
                                    <p className="text-muted-foreground text-sm p-4 col-span-full text-center">Aucune salle n'a encore été ajoutée à ce bâtiment.</p>
                                )}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        ): (
             <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Aucun bâtiment créé.</p>
                <Button variant="link" asChild>
                  <Link href="/dashboard/immobilier/batiments">Cliquez ici pour en ajouter un.</Link>
                </Button>
            </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
             <DialogHeader>
                <DialogTitle>{editingSalle ? 'Modifier la' : 'Nouvelle'} Salle</DialogTitle>
                <DialogDescription>
                    {editingSalle ? 'Mettez à jour les informations de cette salle.' : 'Ajoutez une nouvelle salle à un bâtiment.'}
                </DialogDescription>
            </DialogHeader>
            <SalleForm
                schoolId={schoolId}
                buildings={buildings}
                salle={editingSalle}
                onSave={handleFormSave}
            />
        </DialogContent>
    </Dialog>
     <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible. La salle <strong>{salleToDelete?.name}</strong> sera définitivement supprimée.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSalle} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
