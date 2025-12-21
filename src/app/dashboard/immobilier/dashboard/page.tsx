
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GanttChartSquare, Wrench, Building, CalendarCheck, Clock, User, AlertCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { collection, getCountFromServer, query, where, orderBy, limit } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { reservation_salle as Reservation, tache_maintenance as Tache, staff } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  
  // --- Fetch recent activities ---
  const recentTachesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/maintenance`), where('status', 'in', ['à_faire', 'en_cours']), orderBy('createdAt', 'desc'), limit(5)) : null, [firestore, schoolId]);
  const upcomingReservationsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/reservations_salles`), where('status', '==', 'confirmée'), where('startTime', '>=', new Date().toISOString()), orderBy('startTime', 'asc'), limit(5)) : null, [firestore, schoolId]);
  const staffQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [firestore, schoolId]);
  
  const { data: tachesData, loading: tachesLoading } = useCollection(recentTachesQuery);
  const { data: reservationsData, loading: reservationsLoading } = useCollection(upcomingReservationsQuery);
  const { data: staffData, loading: staffLoading } = useCollection(staffQuery);

  const staffMap = useMemo(() => {
      const map = new Map<string, string>();
      staffData?.forEach(doc => {
          const staff = doc.data() as staff;
          map.set(doc.id, `${staff.firstName} ${staff.lastName}`);
      });
      return map;
  }, [staffData]);

  const loading = schoolLoading || statsLoading || tachesLoading || reservationsLoading || staffLoading;

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

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Maintenance en cours</CardTitle>
                    <CardDescription>Aperçu des dernières tâches de maintenance ouvertes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {tachesData && tachesData.length > 0 ? (tachesData.map(doc => {
                           const tache = doc.data() as Tache;
                           return (
                             <div key={doc.id} className="flex items-center gap-4 p-2 rounded-lg bg-muted/50">
                               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive"><Wrench className="h-4 w-4"/></div>
                               <div className="flex-1">
                                 <p className="font-medium text-sm">{tache.title}</p>
                                 <p className="text-xs text-muted-foreground">Assigné à: {tache.assignedTo ? staffMap.get(tache.assignedTo) || 'N/A' : 'Personne'}</p>
                               </div>
                               <Badge variant={tache.priority === 'haute' ? 'destructive' : tache.priority === 'moyenne' ? 'outline' : 'secondary'} className="capitalize">{tache.priority}</Badge>
                             </div>
                           )
                        })) : loading ? (
                            <Skeleton className="h-24 w-full" />
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Aucune tâche de maintenance en cours.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Prochaines Réservations</CardTitle>
                    <CardDescription>Aperçu des réservations de salles à venir.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="space-y-3">
                        {reservationsData && reservationsData.length > 0 ? (reservationsData.map(doc => {
                           const reservation = doc.data() as Reservation;
                           return (
                             <div key={doc.id} className="flex items-center gap-4 p-2 rounded-lg bg-muted/50">
                               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><CalendarCheck className="h-4 w-4"/></div>
                               <div className="flex-1">
                                 <p className="font-medium text-sm">{reservation.eventName}</p>
                                 <p className="text-xs text-muted-foreground">Par: {reservation.reservedBy ? staffMap.get(reservation.reservedBy) || 'N/A' : 'N/A'}</p>
                               </div>
                               <div className="text-right">
                                    <div className="text-sm font-semibold">{format(new Date(reservation.startTime), 'd MMM', {locale: fr})}</div>
                                    <div className="text-xs text-muted-foreground">{format(new Date(reservation.startTime), 'HH:mm')} - {format(new Date(reservation.endTime), 'HH:mm')}</div>
                               </div>
                             </div>
                           )
                        })) : loading ? (
                            <Skeleton className="h-24 w-full" />
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Aucune réservation à venir.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
       </div>
    </div>
  );
}
