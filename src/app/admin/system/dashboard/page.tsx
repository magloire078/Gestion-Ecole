// app/admin/system/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, getCountFromServer, query, where, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users, 
  Wallet, 
  BarChart3, 
  Settings,
  Shield,
  Database,
  Bell,
  Cpu,
  Globe,
  Lock,
  Server
} from 'lucide-react';
import { SystemMetrics } from '@/components/admin/system-metrics';
import { SchoolsTable } from '@/components/admin/schools-table';
import { BillingOverview } from '@/components/admin/billing-overview';
import { AuditLog } from '@/components/admin/audit-log';

// Mock components until they are created
const SecuritySettings = () => <p>Le composant des paramètres de sécurité sera bientôt disponible.</p>;
const SystemMaintenance = () => <p>Le composant de maintenance système sera bientôt disponible.</p>;


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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-background">
      {/* Header */}
      <header className="border-b bg-white dark:bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold">Administration Système</h1>
                <p className="text-sm text-muted-foreground">
                  Panneau de contrôle global • v2.1.4
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Server className="h-3 w-3 mr-1" />
                Production
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Health Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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

        {/* Main Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="schools">
              <Building className="h-4 w-4 mr-2" />
              Écoles
            </TabsTrigger>
            <TabsTrigger value="billing">
              <Wallet className="h-4 w-4 mr-2" />
              Facturation
            </TabsTrigger>
            <TabsTrigger value="audit">
              <Shield className="h-4 w-4 mr-2" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings className="h-4 w-4 mr-2" />
              Système
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SystemMetrics metrics={metrics} loading={loadingMetrics}/>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Activité récente</CardTitle>
                  <CardDescription>Dernières actions système</CardDescription>
                </CardHeader>
                <CardContent>
                  <AuditLog limit={10} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Alertes système</CardTitle>
                  <CardDescription>Notifications importantes</CardDescription>
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
          </TabsContent>

          <TabsContent value="schools">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Écoles</CardTitle>
                <CardDescription>
                  Liste complète de toutes les écoles et leur statut
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SchoolsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <BillingOverview />
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Journal d'Audit Complet</CardTitle>
                <CardDescription>
                  Toutes les actions effectuées sur le système
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLog limit={50} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Configuration de Sécurité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SecuritySettings />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Système</CardTitle>
                </CardHeader>
                <CardContent>
                  <SystemMaintenance />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}