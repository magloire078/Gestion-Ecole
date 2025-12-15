
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building, 
  Bed, 
  Users, 
  Calendar, 
  Bell,
  UserCheck,
  UserX
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import type { building, occupant, log } from '@/lib/data-types';

export function InternatDashboard({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  const buildingsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/internat_batiments`)), [firestore, schoolId]);
  const occupantsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/internat_occupants`)), [firestore, schoolId]);
  const logsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/internat_entrees_sorties`), where('date', '==', format(new Date(), 'yyyy-MM-dd'))), [firestore, schoolId]);

  const { data: buildingsData } = useCollection(buildingsQuery);
  const { data: occupantsData } = useCollection(occupantsQuery);
  const { data: logsData } = useCollection(logsQuery);
  
  const buildings = useMemo(() => buildingsData?.map(doc => ({ id: doc.id, ...doc.data() } as building & {id: string})) || [], [buildingsData]);
  const occupants = useMemo(() => occupantsData?.map(doc => ({ id: doc.id, ...doc.data() } as occupant)) || [], [occupantsData]);
  const todayLogs = useMemo(() => logsData?.map(doc => ({ id: doc.id, ...doc.data() } as log)) || [], [logsData]);

  useEffect(() => {
    if (buildings.length > 0 && !selectedBuilding) {
      setSelectedBuilding(buildings[0].id);
    }
  }, [buildings, selectedBuilding]);

  
  const currentBuilding = buildings.find(b => b.id === selectedBuilding);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Bâtiments</CardTitle><Building className="h-4 w-4 text-muted-foreground" /></div></CardHeader>
          <CardContent><div className="text-2xl font-bold">{buildings.length}</div><div className="text-xs text-muted-foreground mt-1">{buildings.filter(b => b.status === 'active').length} actifs</div></CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Chambres occupées</CardTitle><Bed className="h-4 w-4 text-muted-foreground" /></div></CardHeader>
          <CardContent><div className="text-2xl font-bold">84/120</div><div className="text-xs text-muted-foreground mt-1">70% de taux d'occupation</div></CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Internes présents</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></div></CardHeader>
          <CardContent><div className="text-2xl font-bold">78</div><div className="text-xs text-muted-foreground mt-1">6 absents ce soir</div></CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Couvre-feu</CardTitle><Bell className="h-4 w-4 text-muted-foreground" /></div></CardHeader>
          <CardContent><div className="text-2xl font-bold">{currentBuilding?.curfew?.weekdays || '22:00'}</div><div className="text-xs text-muted-foreground mt-1">{new Date().getDay() >= 5 ? 'Week-end' : 'Semaine'}</div></CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="occupation" className="space-y-6">
        <TabsList><TabsTrigger value="occupation">Occupation</TabsTrigger><TabsTrigger value="mouvements">Mouvements</TabsTrigger><TabsTrigger value="chambres">Gestion chambres</TabsTrigger><TabsTrigger value="reglement">Règlement</TabsTrigger></TabsList>
        
        <TabsContent value="occupation" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Bâtiments d'internat</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {buildings.map(building => (
                  <div key={building.id} className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedBuilding === building.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`} onClick={() => setSelectedBuilding(building.id)}>
                    <div className="flex justify-between items-start">
                      <div><div className="font-semibold">{building.name}</div><div className="text-sm text-muted-foreground">{building.type === 'garcons' ? 'Garçons' : building.type === 'filles' ? 'Filles' : 'Mixte'}</div></div>
                      <Badge variant={building.status === 'active' ? 'secondary' : 'outline'}>{building.status}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div><div className="text-muted-foreground">Capacité</div><div className="font-medium">{building.capacity} places</div></div>
                      <div><div className="text-muted-foreground">Taux occupation</div><div className="font-medium">78%</div></div>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground mb-1">Équipements</div>
                      <div className="flex flex-wrap gap-1">
                        {building.features?.slice(0, 3).map((feature: string) => (<Badge key={feature} variant="outline" className="text-xs">{feature}</Badge>))}
                        {building.features && building.features.length > 3 && (<Badge variant="outline" className="text-xs">+{building.features.length - 3}</Badge>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {currentBuilding && (
            <Card>
              <CardHeader><CardTitle>Internes - {currentBuilding.name}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {occupants.map(occupant => (
                    <div key={occupant.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div><div className="font-semibold">{occupant.studentId}</div><div className="text-sm text-muted-foreground">Chambre {occupant.roomId}</div></div>
                        <div className="text-right"><Badge variant={occupant.status === 'active' ? 'secondary' : 'outline'}>{occupant.status}</Badge></div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><div className="text-muted-foreground">Arrivée</div><div>{format(new Date(occupant.startDate), 'dd/MM/yyyy')}</div></div>
                        {occupant.endDate && <div><div className="text-muted-foreground">Départ</div><div>{format(new Date(occupant.endDate), 'dd/MM/yyyy')}</div></div>}
                        {occupant.nextPaymentDue && <div><div className="text-muted-foreground">Prochain paiement</div><div>{format(new Date(occupant.nextPaymentDue), 'dd/MM/yyyy')}</div></div>}
                      </div>
                      <div className="mt-3 flex gap-2"><Button size="sm" variant="outline">Voir le dossier</Button><Button size="sm" variant="outline">Enregistrer sortie</Button><Button size="sm" variant="outline">Message au parent</Button></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="mouvements">
          <Card>
            <CardHeader><CardTitle>Mouvements du jour</CardTitle><CardDescription>{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayLogs.map(log => (
                  <div key={log.id} className="flex items-center p-3 border rounded-lg">
                    <div className={`p-2 rounded-full mr-3 ${log.type === 'sortie' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {log.type === 'sortie' ? (<UserX className="h-5 w-5" />) : (<UserCheck className="h-5 w-5" />)}
                    </div>
                    <div className="flex-1"><div className="font-medium">{log.studentId}</div><div className="text-sm text-muted-foreground">{log.reason} • {format(new Date(log.timestamp), 'HH:mm')}</div></div>
                    <div className="text-right"><Badge variant={log.status === 'returned' ? 'secondary' : log.status === 'late' ? 'destructive' : 'outline'}>{log.status === 'returned' ? 'Rentré' : log.status === 'late' ? 'En retard' : 'En cours'}</Badge>{log.status !== 'returned' && <div className="text-xs text-muted-foreground mt-1">Autorisé par: {log.authorizedBy}</div>}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-3">Enregistrer un mouvement</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Élève</Label><Input placeholder="Rechercher un élève..." /></div>
                  <div><Label>Type</Label><select className="w-full p-2 border rounded"><option value="sortie">Sortie</option><option value="entree">Retour</option></select></div>
                  <div><Label>Motif</Label><Input placeholder="Rendez-vous, course..." /></div>
                  <div><Label>Retour prévu</Label><Input type="datetime-local" /></div>
                </div>
                <Button className="mt-4">Enregistrer le mouvement</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
