
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, getCountFromServer, query, where, collectionGroup, doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users, 
  Wallet, 
  Settings,
  Shield,
  Database,
  Bell,
  Cpu,
  Globe,
  Server,
  Wrench,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { SystemMetrics } from '@/components/admin/system-metrics';
import { AuditLog } from '@/components/admin/audit-log';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const SystemSettings = () => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsRef = useMemoFirebase(() => doc(firestore, 'system_settings/default'), [firestore]);
    const { data: settingsData, loading: settingsLoading } = useDoc(settingsRef);
    
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (settingsData) {
            setMaintenanceMode(settingsData.maintenanceMode || false);
        }
    }, [settingsData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setDoc(settingsRef, { maintenanceMode }, { merge: true });
            toast({ title: "Paramètres sauvegardés", description: "Le mode maintenance a été mis à jour."});
        } catch (e) {
             const permissionError = new FirestorePermissionError({
                path: settingsRef.path,
                operation: 'write',
                requestResourceData: { maintenanceMode },
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (settingsLoading) {
        return <Skeleton className="h-24 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Maintenance & Configuration Globale
                </CardTitle>
                <CardDescription>Gérez l'état de la plateforme.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <Label htmlFor="maintenance-mode" className="font-semibold">Mode Maintenance</Label>
                        <p className="text-sm text-muted-foreground">
                            Lorsque activé, seuls les super-admins peuvent se connecter.
                        </p>
                    </div>
                    <Switch
                        id="maintenance-mode"
                        checked={maintenanceMode}
                        onCheckedChange={setMaintenanceMode}
                    />
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Enregistrer les modifications
                </Button>
            </CardFooter>
        </Card>
    );
};


export default function SystemAdminDashboard() {
  const firestore = useFirestore();
  const [metrics, setMetrics] = useState({
    totalSchools: 0,
    activeSchools: 0,
    totalUsers: 0,
    storageUsed: 2.5, // Mock value
    revenue: 0, // Mock value
    activeSubscriptions: 0
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    uptime: 99.9,
    responseTime: 120,
    database: 'connected',
    storage: 'normal'
  });
  
  useEffect(() => {
    if (!firestore) return;

    const fetchMetrics = async () => {
        setLoadingMetrics(true);
        try {
            const schoolsQuery = collection(firestore, 'ecoles');
            const activeSchoolsQuery = query(schoolsQuery, where('subscription.status', 'in', ['active', 'trialing']));
            const usersQuery = collectionGroup(firestore, 'personnel');

            const [schoolsSnap, activeSchoolsSnap, usersSnap] = await Promise.all([
                getCountFromServer(schoolsQuery),
                getCountFromServer(activeSchoolsQuery),
                getCountFromServer(usersQuery),
            ]);

            setMetrics(prev => ({
                ...prev,
                totalSchools: schoolsSnap.data().count,
                activeSchools: activeSchoolsSnap.data().count,
                totalUsers: usersSnap.data().count,
            }));

        } catch (error) {
            console.error("Failed to fetch system metrics:", error);
        } finally {
            setLoadingMetrics(false);
        }
    };

    fetchMetrics();
}, [firestore]);


  return (
    <div className="space-y-6">
      
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold">Tableau de Bord Système</h1>
                <p className="text-muted-foreground">Vue d'ensemble de la santé et des métriques de la plateforme.</p>
            </div>
             <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Server className="h-3 w-3 mr-1" />
                Production
              </Badge>
        </div>

        {/* Health Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={systemHealth.status === 'healthy' ? 'border-green-200' : 'border-amber-200'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Statut système</p>
                  <p className="text-2xl font-bold">{systemHealth.status === 'healthy' ? '✅ Opérationnel' : '⚠️ Dégradé'}</p>
                </div>
                <Cpu className={`h-8 w-8 ${systemHealth.status === 'healthy' ? 'text-green-500' : 'text-amber-500'}`} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="text-2xl font-bold">{systemHealth.uptime}%</p>
                </div>
                <Globe className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Écoles actives</p>
                  <p className="text-2xl font-bold">{metrics.activeSchools}</p>
                </div>
                <Building className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stockage utilisé</p>
                  <p className="text-2xl font-bold">{metrics.storageUsed} Go</p>
                </div>
                <Database className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <SystemMetrics metrics={metrics} loading={loadingMetrics}/>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>Dernières actions critiques sur le système.</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLog limit={10} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Alertes système</CardTitle>
              <CardDescription>Notifications importantes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Backup hebdomadaire requis</p>
                      <p className="text-sm text-muted-foreground">Dernier backup: il y a 6 jours</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">3 nouvelles écoles en attente</p>
                      <p className="text-sm text-muted-foreground">Validation requise</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <SystemSettings />
    </div>
  );
}
