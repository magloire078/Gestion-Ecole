

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import type { route as Route, bus as Bus, staff as Staff } from '@/lib/data-types';

// Mocks - à remplacer par de vraies données Leaflet si nécessaire.
// Pour le rendu côté serveur et les tests, nous n'utiliserons pas de carte réelle.
const MapContainer = ({ children }: { children: React.ReactNode }) => <div className="h-full w-full bg-muted flex items-center justify-center"><p className="text-muted-foreground">La carte est désactivée en mode prévisualisation.</p>{children}</div>;
const TileLayer = () => null;
const Marker = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const Popup = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;


export function LiveTransportTracking({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const routesQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/transport_lignes`)), [firestore, schoolId]);
  const busesQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/transport_bus`)), [firestore, schoolId]);
  const driversQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/personnel`)), [firestore, schoolId]);

  const { data: routesData, loading: routesLoading } = useCollection(routesQuery);
  const { data: busesData, loading: busesLoading } = useCollection(busesQuery);
  const { data: driversData, loading: driversLoading } = useCollection(driversQuery);
  
  const routes: (Route & { id: string })[] = useMemo(() => routesData?.map(doc => ({ id: doc.id, ...doc.data() } as Route & { id: string })) || [], [routesData]);
  const buses: (Bus & { id: string })[] = useMemo(() => busesData?.map(doc => ({ id: doc.id, ...doc.data() } as Bus & { id: string })) || [], [busesData]);
  const drivers: (Staff & { id: string })[] = useMemo(() => driversData?.map(doc => ({ id: doc.id, ...doc.data() } as Staff & { id: string })) || [], [driversData]);

  const busMap = useMemo(() => new Map(buses.map(b => [b.id, b])), [buses]);
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  
  useEffect(() => {
      if(routes.length > 0 && !selectedRouteId) {
          setSelectedRouteId(routes[0].id);
      }
  }, [routes, selectedRouteId]);

  const loading = routesLoading || busesLoading || driversLoading;
  
  const currentRoute = routes.find(r => r.id === selectedRouteId);
  const currentBus = currentRoute ? busMap.get(currentRoute.busId) : null;
  const currentDriver = currentRoute ? driverMap.get(currentRoute.driverId || '') : null;
  
  if(loading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
          </div>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <Skeleton className="lg:col-span-1 h-96 w-full" />
               <Skeleton className="lg:col-span-2 h-96 w-full" />
           </div>
        </div>
      )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Bus actifs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{routes.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">En retard</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{routes.filter(r => r.status === 'delayed').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Élèves transportés</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">...</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ponctualité</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">...%</div></CardContent></Card>
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
              {routes.length === 0 && <p className="text-muted-foreground text-center py-4">Aucune ligne de transport définie.</p>}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{currentRoute ? `Trajet: ${currentRoute.name}` : 'Sélectionnez une ligne'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-lg overflow-hidden bg-muted">
              {currentRoute && (
                <MapContainer>
                  <TileLayer />
                  <Marker>
                    <Popup>
                      <div className="font-semibold">Bus {currentBus?.registrationNumber}</div>
                    </Popup>
                  </Marker>
                </MapContainer>
              )}
            </div>
            
            {currentRoute && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><div className="text-sm text-muted-foreground">Conducteur</div><div className="font-medium">{currentDriver ? `${currentDriver.firstName} ${currentDriver.lastName}`: 'Non assigné'}</div></div>
                  <div><div className="text-sm text-muted-foreground">Capacité Bus</div><div className="font-medium">{currentBus?.capacity || 'N/A'} places</div></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
