
'use client';

import { useSchoolData } from '@/hooks/use-school-data';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { BuildingManager } from '@/components/building-manager';
import { BuildingForm } from '@/components/immobilier/building-form';
import { SalleForm } from '@/components/immobilier/salle-form';

export default function BatimentsPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();

  const getRoomDeletionBlocker = async (roomId: string): Promise<string | null> => {
    if (!schoolId) return null;

    const [inventorySnap, reservationsSnap] = await Promise.all([
      getDocs(query(
        collection(firestore, `ecoles/${schoolId}/inventaire`),
        where('locationId', '==', `salle:${roomId}`),
      )),
      getDocs(query(
        collection(firestore, `ecoles/${schoolId}/reservations_salles`),
        where('salleId', '==', roomId),
      )),
    ]);

    if (inventorySnap.size > 0) {
      return `${inventorySnap.size} article(s) de l'inventaire sont encore rattachés à cette salle. Déplacez-les avant de la supprimer.`;
    }
    if (reservationsSnap.size > 0) {
      return `${reservationsSnap.size} réservation(s) existent encore pour cette salle. Supprimez-les ou déplacez-les avant de supprimer la salle.`;
    }
    return null;
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
      roomCollectionName="salles"
      pageTitle="Plan de l'Établissement"
      pageDescription="Gérez les bâtiments et les salles qui les composent."
      buildingNameField="name"
      roomNameField="name"
      addBuildingButtonText="Ajouter un bâtiment"
      addRoomButtonText="Ajouter une salle"
      BuildingFormComponent={BuildingForm}
      RoomFormComponent={SalleForm}
      permission="manageRooms"
      getRoomDeletionBlocker={getRoomDeletionBlocker}
    />
  );
}
    
