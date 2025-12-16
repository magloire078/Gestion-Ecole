
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GanttChartSquare, Wrench, Building, CalendarCheck } from 'lucide-react';
import { useFirestore, useSchoolData } from '@/firebase';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) {
        if(!schoolLoading) setLoading(false);
        return;
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const inventaireQuery = query(collection(firestore, `ecoles/${schoolId}/inventaire`));
            const sallesQuery = query(collection(firestore, `ecoles/${schoolId}/salles`));
            const maintenanceQuery = query(collection(firestore, `ecoles/${schoolId}/maintenance`), where('status', '!=', 'terminée'));
            
            const [inventaireSnap, sallesSnap, maintenanceSnap] = await Promise.all([
                getCountFromServer(inventaireQuery),
                getCountFromServer(sallesQuery),
                getCountFromServer(maintenanceQuery),
            ]);

            setStats({
                equipements: inventaireSnap.data().count,
                salles: sallesSnap.data().count,
                tachesOuvertes: maintenanceSnap.data().count,
                reservations: 0, // Placeholder
            });

        } catch (error) {
            console.error("Erreur lors de la récupération des statistiques immobilières:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchStats();
  }, [schoolId, firestore, schoolLoading]);
  
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
        <StatCard title="Tâches de Maintenance" value={stats?.tachesOuvertes ?? 0} icon={Wrench} description="Tâches en cours ou à faire" loading={loading} />
        <StatCard title="Réservations" value={stats?.reservations ?? 0} icon={CalendarCheck} description="Réservations de salles à venir" loading={loading} />
      </div>
       <Card>
        <CardHeader>
            <CardTitle>Bienvenue</CardTitle>
            <CardDescription>Utilisez les onglets ci-dessus pour naviguer entre les différentes sections de la gestion immobilière.</CardDescription>
        </CardHeader>
        <CardContent>
            <p>Ce tableau de bord vous donne un aperçu rapide de l'état de vos infrastructures. Explorez les sections pour gérer en détail votre patrimoine.</p>
        </CardContent>
       </Card>
    </div>
  );
}
