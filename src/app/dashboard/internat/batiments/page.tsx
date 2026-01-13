
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
        description: "Vous ne pouvez pas supprimer un bâtiment qui contient encore des chambres."
      });
      return;
    }

    try {
      await deleteDoc(doc(firestore, `ecoles/${schoolId}/batiments`, buildingId));
      toast({ title: "Bâtiment supprimé", description: `Le bâtiment "${buildingName}" a été supprimé.` });
    } catch (e) {
       const permissionError = new FirestorePermissionError({
        path: `ecoles/${schoolId}/batiments/${buildingId}`,
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
      buildingCollectionName="batiments"
      roomCollectionName="internat_chambres"
      pageTitle="Gestion des Bâtiments de l'Internat"
      pageDescription="Gérez les bâtiments et dortoirs de l'internat."
      buildingNameField="name"
      roomNameField="number"
      addBuildingButtonText="Ajouter un bâtiment"
      addRoomLink="/dashboard/internat/chambres"
      BuildingFormComponent={BuildingForm}
      onDelete={handleDeleteBuilding}
    />
  );
}
