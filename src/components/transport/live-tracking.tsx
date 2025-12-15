
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

// Mocks - à remplacer par de vraies données Leaflet si nécessaire.
// Pour le rendu côté serveur et les tests, nous n'utiliserons pas de carte réelle.
const MapContainer = ({ children }: { children: React.ReactNode }) => <div className="h-full w-full bg-muted flex items-center justify-center"><p className="text-muted-foreground">La carte est désactivée en mode prévisualisation.</p>{children}</div>;
const TileLayer = () => null;
const Marker = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const Popup = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;


export function LiveTransportTracking({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [livePositions, setLivePositions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadRoutes();
    // La simulation du live tracking sera retirée pour l'instant
  }, [schoolId]);
  
  const loadRoutes = async () => {
    setLoading(true);
    // Simuler des routes pour l'instant
    const mockRoutes = [
      {
        id: 'route_001',
        name: 'Ligne Nord',
        busId: 'BUS-01',
        status: 'on_time',
        driverId: 'driver_001',
        currentLocation: { lat: 48.86, lng: 2.35 },
        schedule: { morning: { startTime: '07:00', stops: [{ stopId: 'stop_001', name: 'Mairie'}, {stopId: 'stop_002', name: 'Gare'}] } }
      },
      {
        id: 'route_002',
        name: 'Ligne Sud',
        busId: 'BUS-02',
        status: 'delayed',
        driverId: 'driver_002',
        currentLocation: { lat: 48.84, lng: 2.34 },
        schedule: { morning: { startTime: '07:10', stops: [{ stopId: 'stop_003', name: 'Marché'}, {stopId: 'stop_004', name: 'Parc'}]} }
      }
    ];
    setRoutes(mockRoutes);
    
    // Simuler les positions live
    const mockLivePositions: Record<string, any> = {};
    mockRoutes.forEach(route => {
        mockLivePositions[route.id] = { ...route.currentLocation, timestamp: new Date().toISOString() };
    });
    setLivePositions(mockLivePositions);

    if (mockRoutes.length > 0) {
      setSelectedRoute(mockRoutes[0].id);
    }
    setLoading(false);
  };
  
  const currentRoute = routes.find(r => r.id === selectedRoute);
  
  if(loading) {
      return <Skeleton className="h-96 w-full" />
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Bus actifs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{routes.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">En retard</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{routes.filter(r => r.status === 'delayed').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Élèves transportés</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">245</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ponctualité</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">94%</div></CardContent></Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Lignes de bus</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routes.map(route => (
                <div key={route.id} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedRoute === route.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`} onClick={() => setSelectedRoute(route.id)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{route.name}</div>
                      <div className="text-sm text-muted-foreground">Bus: {route.busId} • {route.schedule.morning.startTime}</div>
                    </div>
                    <Badge variant={route.status === 'on_time' ? 'secondary' : route.status === 'delayed' ? 'destructive' : 'outline'}>
                      {route.status === 'on_time' ? 'À l\'heure' : route.status === 'delayed' ? 'Retard' : 'Annulé'}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>{route.schedule.morning.stops.length} arrêts</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{currentRoute ? `Trajet: ${currentRoute.name}` : 'Sélectionnez une ligne'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-lg overflow-hidden bg-muted">
              {currentRoute && livePositions[currentRoute.id] && (
                <MapContainer>
                  <TileLayer />
                  <Marker>
                    <Popup>
                      <div className="font-semibold">Bus {currentRoute.busId}</div>
                    </Popup>
                  </Marker>
                  
                  {currentRoute.schedule.morning.stops.map((stop: any, index: number) => (
                    <Marker key={stop.stopId}>
                      <Popup>
                        <div className="font-semibold">{stop.name}</div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
            
            {currentRoute && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><div className="text-sm text-muted-foreground">Conducteur</div><div className="font-medium">{currentRoute.driverId}</div></div>
                  <div><div className="text-sm text-muted-foreground">Capacité</div><div className="font-medium">50 places</div></div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Prochain arrêt</div>
                  <div className="p-3 bg-muted rounded-lg"><div className="font-medium">Place de la Mairie</div><div className="text-sm">Heure prévue: 07:15 • 5 élèves à embarquer</div></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
