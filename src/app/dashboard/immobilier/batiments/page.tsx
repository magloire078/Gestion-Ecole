
'use client';

import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { BuildingManager } from '@/components/building-manager';
import { BuildingForm } from '@/components/internat/building-form';

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
      buildingCollectionName="batiments"
      roomCollectionName="salles"
      pageTitle="Plan de l'Établissement"
      pageDescription="Visualisez les bâtiments et les salles qui les composent."
      buildingNameField="name"
      roomNameField="name"
      addBuildingButtonText="Ajouter un bâtiment"
      addRoomLink="/dashboard/immobilier/salles"
      BuildingFormComponent={BuildingForm}
    />
  );
}
