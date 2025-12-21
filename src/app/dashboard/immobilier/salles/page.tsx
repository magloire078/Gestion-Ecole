
'use client';

import { BuildingManager } from '@/components/building-manager';
import { RoomForm as SalleForm } from '@/components/internat/room-form'; // Renommé pour plus de clarté
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function SallesPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();

  if (schoolLoading || !schoolId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <BuildingManager
      schoolId={schoolId}
      // Note: On utilise 'internat_batiments' car il n'y a pas de collection séparée pour les bâtiments immobiliers.
      // C'est un point à potentiellement revoir dans le futur si la distinction devient nécessaire.
      buildingCollectionName="internat_batiments" 
      roomCollectionName="salles"
      pageTitle="Gestion des Salles"
      pageDescription="Gérez les salles de classe, de réunion et autres locaux de l'établissement."
      buildingNameField="name"
      roomNameField="name" // Les salles utilisent 'name'
      addBuildingButtonText="Ajouter un bâtiment"
      addRoomLink="/dashboard/immobilier/salles" // Lien pour ajouter une salle est la page actuelle
      BuildingFormComponent={SalleForm} // Le formulaire de salle est différent de celui de l'internat
    />
  );
}
