
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GanttChartSquare, Wrench, Building, CalendarCheck } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection, getCountFromServer, query, where, orderBy, limit } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MaintenanceList } from '@/components/immobilier/maintenance-list';
import { InventorySummary } from '@/components/immobilier/inventory-summary';

interface ImmobilierStats {
    equipements: number;
    salles: number;
    tachesOuvertes: number;
    reservations: number;
}

export default function ImmobilierDashboardPage() {
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();
  const [stats, setStats] = useState<ImmobilierStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // --- Fetch main stats ---
  useEffect(() => {
    if (!schoolId || !firestore) {
        if (!schoolLoading) setStatsLoading(false);
        return;
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const queries = [
                getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/inventaire`))),
                getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/salles`))),
                getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/maintenance`), where('status', '!=', 'terminée'))),
                getCountFromServer(query(collection(firestore, `ecoles/${schoolId}/reservations_salles`), where('status', '==', 'confirmée')))
            ];
            
            const [inventaireSnap, sallesSnap, maintenanceSnap, reservationsSnap] = await Promise.all(queries);

            setStats({
                equipements: inventaireSnap.data().count,
                salles: sallesSnap.data().count,
                tachesOuvertes: maintenanceSnap.data().count,
                reservations: reservationsSnap.data().count,
            });

        } catch (error) {
            console.error("Erreur lors de la récupération des statistiques immobilières:", error);
        } finally {
            setStatsLoading(false);
        }
    };

    fetchStats();
  }, [schoolId, firestore, schoolLoading]);
  
  const loading = schoolLoading || statsLoading;

  const StatCard = ({ title, value, icon: Icon, description, loading }: { title: string, value: number, icon: React.ElementType, description: string, loading: boolean }) => (
     <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loading ? (
                <>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </>
            ) : (
                <>
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </>
            )}
        </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Équipements" value={stats?.equipements ?? 0} icon={GanttChartSquare} description="Nombre total d'équipements" loading={loading} />
        <StatCard title="Salles" value={stats?.salles ?? 0} icon={Building} description="Salles de classe, bureaux, etc." loading={loading} />
        <StatCard title="Maintenance" value={stats?.tachesOuvertes ?? 0} icon={Wrench} description="Tâches en cours ou à faire" loading={loading} />
        <StatCard title="Réservations" value={stats?.reservations ?? 0} icon={CalendarCheck} description="Réservations de salles confirmées" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <MaintenanceList schoolId={schoolId!} limit={5} />
        </div>
        <div className="lg:col-span-1">
            <InventorySummary schoolId={schoolId!} />
        </div>
      </div>
    </div>
  );
}
