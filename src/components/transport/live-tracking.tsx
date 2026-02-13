'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { route as Route, bus as Bus, staff as Staff, transportSubscription, routeSchedule } from '@/lib/data-types';
import { Users, Bus as BusIcon, Clock, Percent, Sun, Moon } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';


const ScheduleDetail = ({ schedule, title, icon: Icon }: { schedule?: routeSchedule, title: string, icon: React.ElementType }) => {
  if (!schedule || !schedule.stops || schedule.stops.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun horaire {title.toLowerCase()} défini.</p>;
  }
  return (
    <div className="space-y-3">
      <h4 className="font-semibold flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title} (Départ: {schedule.startTime || 'N/A'})</h4>
      <div className="space-y-2 pl-2 border-l-2">
        {schedule.stops.map((stop, index) => (
          <div key={index} className="flex items-center gap-3 relative pl-5">
            <div className="absolute left-[-9px] top-1 h-4 w-4 rounded-full bg-primary/20 border-2 border-primary/50" />
            <div>
              <p className="font-medium text-sm">{stop.name}</p>
              <p className="text-xs text-muted-foreground">{stop.address}</p>
            </div>
            <div className="ml-auto text-sm font-mono bg-muted px-2 py-1 rounded-md">{stop.scheduledTime}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LiveTransportTracking({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const routesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/transport_lignes`)), [firestore, schoolId]);
  const busesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/transport_bus`)), [firestore, schoolId]);
  const driversQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/personnel`), where('role', '==', 'chauffeur')), [firestore, schoolId]);
  const subscriptionsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/transport_abonnements`), where('status', '==', 'active')), [firestore, schoolId]);

  const { data: routesData, loading: routesLoading } = useCollection(routesQuery);
  const { data: busesData, loading: busesLoading } = useCollection(busesQuery);
  const { data: driversData, loading: driversLoading } = useCollection(driversQuery);
  const { data: subscriptionsData, loading: subscriptionsLoading } = useCollection(subscriptionsQuery);

  const routes: (Route & { id: string })[] = useMemo(() => routesData?.map(doc => ({ id: doc.id, ...doc.data() } as Route & { id: string })) || [], [routesData]);
  const buses: (Bus & { id: string })[] = useMemo(() => busesData?.map(doc => ({ id: doc.id, ...doc.data() } as Bus & { id: string })) || [], [busesData]);
  const drivers: (Staff & { id: string })[] = useMemo(() => driversData?.map(doc => ({ id: doc.id, ...doc.data() } as Staff & { id: string })) || [], [driversData]);

  const busMap = useMemo(() => new Map(buses.map(b => [b.id, b])), [buses]);
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);

  const transportedStudents = useMemo(() => subscriptionsData?.length || 0, [subscriptionsData]);
  const activeBuses = useMemo(() => buses.filter(bus => bus.status === 'active').length, [buses]);

  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  const loading = routesLoading || busesLoading || driversLoading || subscriptionsLoading;

  const currentRoute = routes.find(r => r.id === selectedRouteId);
  const currentBus = currentRoute ? busMap.get(currentRoute.busId) : null;
  const currentDriver = currentRoute ? driverMap.get(currentRoute.driverId || '') : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Bus actifs" value={activeBuses} icon={BusIcon} loading={loading} />
        <StatCard title="En retard" value={routes.filter(r => r.status === 'delayed').length} icon={Clock} loading={loading} />
        <StatCard title="Élèves Transportés" value={transportedStudents} icon={Users} loading={loading} />
        <StatCard title="Ponctualité" value="...%" icon={Percent} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Lignes de bus</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routes.map(route => (
                <div key={route.id} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedRouteId === route.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`} onClick={() => setSelectedRouteId(route.id)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{route.name}</div>
                      <div className="text-sm text-muted-foreground">Bus: {busMap.get(route.busId)?.registrationNumber || 'N/A'} • {route.schedule?.morning?.startTime}</div>
                    </div>
                    <Badge variant={route.status === 'on_time' ? 'secondary' : route.status === 'delayed' ? 'destructive' : 'outline'}>
                      {route.status === 'on_time' ? 'À l\'heure' : route.status === 'delayed' ? 'Retard' : 'Annulé'}
                    </Badge>
                  </div>
                </div>
              ))}
              {routes.length === 0 && !loading && <p className="text-muted-foreground text-center py-4">Aucune ligne de transport définie.</p>}
              {loading && <Skeleton className="h-24 w-full" />}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{currentRoute ? `Itinéraire: ${currentRoute.name}` : 'Sélectionnez une ligne'}</CardTitle>
            {currentRoute && (
              <CardDescription>
                Bus: <span className="font-semibold">{currentBus?.registrationNumber || 'N/A'}</span> •
                Conducteur: <span className="font-semibold">{currentDriver ? `${currentDriver.firstName} ${currentDriver.lastName}` : 'N/A'}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {currentRoute ? (
              <div className="space-y-6">
                <ScheduleDetail schedule={currentRoute.schedule?.morning} title="Trajet Matin" icon={Sun} />
                <ScheduleDetail schedule={currentRoute.schedule?.evening} title="Trajet Soir" icon={Moon} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>Sélectionnez une ligne pour voir les détails de l&apos;itinéraire.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
