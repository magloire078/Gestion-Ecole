'use client';

import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { BuildingManager } from '@/components/building-manager';
import { BuildingForm } from '@/components/internat/building-form';
import { RoomForm } from '@/components/internat/room-form';

export default function BatimentsPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();

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
      buildingCollectionName="internat_batiments"
      roomCollectionName="internat_chambres"
      pageTitle="Gestion des Bâtiments de l'Internat"
      pageDescription="Gérez les bâtiments et dortoirs de l'internat."
      buildingNameField="name"
      roomNameField="number"
      addBuildingButtonText="Ajouter un bâtiment"
      addRoomButtonText="Ajouter une chambre"
      BuildingFormComponent={BuildingForm}
      RoomFormComponent={RoomForm}
      permission="manageInternat"
    />
  );
}
