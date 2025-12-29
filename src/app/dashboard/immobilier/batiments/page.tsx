
'use client';

import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { BuildingManager } from '@/components/building-manager';
import { BuildingForm } from '@/components/internat/building-form';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function BatimentsPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDeleteBuilding = async (buildingId: string, buildingName: string, roomCount: number) => {
    if (!schoolId) return;

    if (roomCount > 0) {
      toast({
        variant: "destructive",
        title: "Action impossible",
        description: "Vous ne pouvez pas supprimer un bâtiment qui contient encore des salles."
      });
      return;
    }

    const docRef = doc(firestore, `ecoles/${schoolId}/salles/${buildingId}`);
    try {
      await deleteDoc(docRef);
      toast({ title: "Bâtiment supprimé", description: `Le bâtiment "${buildingName}" a été supprimé.` });
    } catch (e) {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  if (schoolLoading || !schoolId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <BuildingManager
      schoolId={schoolId}
      buildingCollectionName="salles"
      roomCollectionName="salles"
      pageTitle="Plan de l'Établissement"
      pageDescription="Visualisez les bâtiments et les salles qui les composent."
      buildingNameField="name"
      roomNameField="name"
      addBuildingButtonText="Ajouter un bâtiment"
      addRoomLink="/dashboard/immobilier/salles"
      BuildingFormComponent={BuildingForm}
      onDelete={handleDeleteBuilding}
    />
  );
}
