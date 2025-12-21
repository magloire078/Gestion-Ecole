
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Building2, PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
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
} from "@/components/ui/alert-dialog"

interface Building {
  id: string;
  name: string;
  [key: string]: any; 
}

interface Room {
  id: string;
  buildingId: string;
  name?: string; 
  number?: string;
  [key: string]: any;
}

interface BuildingManagerProps {
  schoolId: string;
  buildingCollectionName: string;
  roomCollectionName: string;
  pageTitle: string;
  pageDescription: string;
  buildingNameField: keyof Building;
  roomNameField: keyof Room;
  addBuildingButtonText: string;
  addRoomLink: string;
  BuildingFormComponent: React.FC<any>;
  onDelete: (buildingId: string, buildingName: string, roomCount: number) => Promise<void>;
}

export function BuildingManager({
  schoolId,
  buildingCollectionName,
  roomCollectionName,
  pageTitle,
  pageDescription,
  buildingNameField,
  roomNameField,
  addBuildingButtonText,
  addRoomLink,
  BuildingFormComponent,
  onDelete
}: BuildingManagerProps) {
  const firestore = useFirestore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);

  const buildingsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/${buildingCollectionName}`)), [firestore, schoolId, buildingCollectionName]);
  const roomsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/${roomCollectionName}`)), [firestore, schoolId, roomCollectionName]);

  const { data: buildingsData, loading: buildingsLoading } = useCollection(buildingsQuery);
  const { data: roomsData, loading: roomsLoading } = useCollection(roomsQuery);
  
  const buildings: Building[] = useMemo(() => buildingsData?.map(doc => ({ id: doc.id, ...doc.data() } as Building)) || [], [buildingsData]);
  const rooms: Room[] = useMemo(() => roomsData?.map(doc => ({ id: doc.id, ...doc.data() } as Room)) || [], [roomsData]);

  const roomsByBuilding = useMemo(() => {
    const grouped: Record<string, Room[]> = {};
    for (const room of rooms) {
      if (room.buildingId) {
        if (!grouped[room.buildingId]) {
          grouped[room.buildingId] = [];
        }
        grouped[room.buildingId].push(room);
      }
    }
    return grouped;
  }, [rooms]);
  
  const isLoading = buildingsLoading || roomsLoading;
  
  const handleOpenForm = (building: Building | null) => {
    setEditingBuilding(building);
    setIsFormOpen(true);
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setEditingBuilding(null);
  };
  
  const handleDeleteConfirm = () => {
    if (buildingToDelete) {
      onDelete(buildingToDelete.id, buildingToDelete.name, roomsByBuilding[buildingToDelete.id]?.length || 0);
      setBuildingToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">{pageTitle}</h2>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>
        <Button onClick={() => handleOpenForm(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {addBuildingButtonText}
        </Button>
      </div>

      {buildings.length > 0 ? (
        <Accordion type="multiple" defaultValue={buildings.map(b => b.id)} className="w-full space-y-4">
          {buildings.map(building => (
            <AccordionItem value={building.id} key={building.id} className="border rounded-lg overflow-hidden bg-card">
              <AccordionTrigger className="p-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-4 text-lg font-semibold flex-1">
                  <Building2 className="h-6 w-6 text-primary" />
                  {building[buildingNameField]}
                  <Badge variant="outline" className="font-mono text-xs">{roomsByBuilding[building.id]?.length || 0} salle(s)/chambre(s)</Badge>
                </div>
              </AccordionTrigger>
              <div className="px-4 -mt-4 mb-2 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleOpenForm(building)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setBuildingToDelete(building)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <AccordionContent>
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                    {(roomsByBuilding[building.id] || []).map(room => (
                      <div key={room.id} className="p-4 border rounded-lg space-y-2 bg-background">
                        <div className="font-bold">{room[roomNameField]}</div>
                        <div className="text-sm text-muted-foreground">Capacité: {room.capacity}</div>
                      </div>
                    ))}
                    {(!roomsByBuilding[building.id] || roomsByBuilding[building.id].length === 0) && (
                      <p className="text-muted-foreground text-sm p-4 col-span-full text-center">
                        Aucune salle/chambre dans ce bâtiment. <Link href={addRoomLink} className="text-primary underline">Ajoutez-en une</Link>.
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
         <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Aucun bâtiment créé.</p>
            <Button variant="link" onClick={() => handleOpenForm(null)}>
              Cliquez ici pour en ajouter un.
            </Button>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBuilding ? 'Modifier le' : 'Nouveau'} Bâtiment</DialogTitle>
          </DialogHeader>
          <BuildingFormComponent building={editingBuilding} onSave={handleFormSave} collectionName={buildingCollectionName} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!buildingToDelete} onOpenChange={(open) => !open && setBuildingToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                   Cette action est irréversible. Le bâtiment <strong>"{buildingToDelete?.name}"</strong> sera supprimé.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
