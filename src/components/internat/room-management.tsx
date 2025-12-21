
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, deleteDoc, doc } from 'firebase/firestore';
import type { building, room } from '@/lib/data-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { BedDouble, PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RoomForm } from './room-form';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export function RoomManagement({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const canManageContent = !!user?.profile?.permissions?.manageInternat;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<(room & { id: string }) | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<(room & { id: string }) | null>(null);

  const buildingsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/internat_batiments`)), [firestore, schoolId]);
  const roomsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/internat_chambres`)), [firestore, schoolId]);

  const { data: buildingsData, loading: buildingsLoading } = useCollection(buildingsQuery);
  const { data: roomsData, loading: roomsLoading } = useCollection(roomsQuery);
  
  const buildings = useMemo(() => buildingsData?.map(doc => ({ id: doc.id, ...doc.data() } as building & {id: string})) || [], [buildingsData]);
  const rooms = useMemo(() => roomsData?.map(doc => ({ id: doc.id, ...doc.data() } as room & {id: string})) || [], [roomsData]);

  const roomsByBuilding = useMemo(() => {
    const grouped: Record<string, (room & {id: string})[]> = {};
    for (const room of rooms) {
        if (!grouped[room.buildingId]) {
            grouped[room.buildingId] = [];
        }
        grouped[room.buildingId].push(room);
    }
    return grouped;
  }, [rooms]);

  const isLoading = buildingsLoading || roomsLoading;

  const handleOpenForm = (room: (room & { id: string }) | null) => {
      setEditingRoom(room);
      setIsFormOpen(true);
  }
  
  const handleFormSave = () => {
      setIsFormOpen(false);
      setEditingRoom(null);
  }

  const handleOpenDeleteDialog = (room: room & { id: string }) => {
    setRoomToDelete(room);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteRoom = async () => {
    if (!schoolId || !roomToDelete) return;
    try {
        await deleteDoc(doc(firestore, `ecoles/${schoolId}/internat_chambres`, roomToDelete.id));
        toast({ title: 'Chambre supprimée' });
    } catch(e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `ecoles/${schoolId}/internat_chambres/${roomToDelete.id}`, operation: 'delete'}));
    } finally {
        setIsDeleteDialogOpen(false);
    }
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
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case 'available': return 'secondary';
        case 'occupied': return 'default';
        case 'maintenance': return 'destructive';
        default: return 'outline';
    }
  }

  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return 'N/A';
    return `${value.toLocaleString('fr-FR')} CFA`;
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Gestion des Chambres</CardTitle>
                <CardDescription>Visualisez et gérez les chambres de chaque bâtiment.</CardDescription>
            </div>
            {canManageContent && (
                <Button size="sm" onClick={() => handleOpenForm(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajouter une chambre
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
                                {(roomsByBuilding[building.id] || []).map(room => (
                                    <div key={room.id} className="p-4 border rounded-lg space-y-2 relative group">
                                        <div className="font-bold flex items-center gap-2"><BedDouble className="h-4 w-4" />Chambre {room.number}</div>
                                        <Badge variant={getStatusBadgeVariant(room.status)} className="absolute top-4 right-4">{room.status}</Badge>
                                        <div className="text-sm text-muted-foreground">Capacité: {room.capacity} personnes</div>
                                        <div className="text-sm font-semibold">{formatCurrency(room.monthlyRate)} / mois</div>
                                         {canManageContent && (
                                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => handleOpenForm(room)}><Edit className="mr-2 h-4 w-4"/>Modifier</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(room)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                         )}
                                    </div>
                                ))}
                                {(!roomsByBuilding[building.id] || roomsByBuilding[building.id].length === 0) && (
                                    <p className="text-muted-foreground text-sm p-4 col-span-full text-center">Aucune chambre n'a encore été ajoutée à ce bâtiment.</p>
                                )}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        ): (
            <p className="text-muted-foreground text-center py-8">Aucun bâtiment n'a été créé. Commencez par en ajouter un.</p>
        )}
      </CardContent>
    </Card>

    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
             <DialogHeader>
                <DialogTitle>{editingRoom ? 'Modifier la' : 'Nouvelle'} Chambre</DialogTitle>
                <DialogDescription>
                    {editingRoom ? 'Mettez à jour les informations de cette chambre.' : 'Ajoutez une nouvelle chambre à un bâtiment.'}
                </DialogDescription>
            </DialogHeader>
            <RoomForm
                schoolId={schoolId}
                buildings={buildings}
                room={editingRoom}
                onSave={handleFormSave}
            />
        </DialogContent>
    </Dialog>
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                    La chambre <strong>{roomToDelete?.number}</strong> sera définitivement supprimée.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRoom} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
