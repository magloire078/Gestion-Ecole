
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users, 
  Server,
  Bell,
  Cpu,
  Globe,
  CreditCard
} from 'lucide-react';
import { SystemMetrics } from '@/components/admin/system-metrics';
import { AuditLog } from '@/components/admin/audit-log';
import type { school as School } from '@/lib/data-types';


export default function SystemAdminDashboard() {
  const firestore = useFirestore();
  const [stats, setStats] = useState({
    activeSchools: 0,
    activeSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    uptime: 99.9,
  });
  
  useEffect(() => {
    if (!firestore) return;

    const fetchStats = async () => {
        setLoading(true);
        try {
            const schoolsQuery = query(collection(firestore, 'ecoles'), where('status', '!=', 'deleted'));
            const schoolsSnap = await getDocs(schoolsQuery);
            
            let activeSubscriptionCount = 0;

            schoolsSnap.forEach(doc => {
                const school = doc.data() as School;
                if (school.subscription && school.subscription.status === 'active') {
                    activeSubscriptionCount++;
                }
            });

            setStats({
                activeSchools: schoolsSnap.size,
                activeSubscriptions: activeSubscriptionCount,
            });

        } catch (error) {
            console.error("Failed to fetch system dashboard stats:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchStats();
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
                  <p className="text-sm text-muted-foreground">Uptime (30j)</p>
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
                  <p className="text-2xl font-bold">{stats.activeSchools}</p>
                </div>
                <Building className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
           <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abonnements Actifs</p>
                  <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                </div>
                <CreditCard className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <SystemMetrics />
        
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
    </div>
  );
}
