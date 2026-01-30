
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Server,
  Bell,
  RefreshCw
} from 'lucide-react';
import { SystemMetrics } from '@/components/admin/system-metrics';
import { AuditLog } from '@/components/admin/audit-log';
import { DashboardStatCards } from '@/components/admin/dashboard-stat-cards';
import { useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { resetDemoTrial } from '@/services/school-services';

export default function SystemAdminDashboard() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [pendingSchools, setPendingSchools] = useState(0);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    setLoadingAlerts(true);
    const q = query(collection(firestore, 'ecoles'), where('subscription.status', '==', 'trialing'));
    getCountFromServer(q)
      .then(snap => setPendingSchools(snap.data().count))
      .catch(console.error)
      .finally(() => setLoadingAlerts(false));
  }, [firestore]);

  const handleResetDemo = async () => {
    if (!user || !user.uid) return;
    setIsResetting(true);
    try {
      await resetDemoTrial(firestore, user.uid);
      toast({ title: 'Succès', description: "La période d'essai de l'école de démo a été réinitialisée." });
    } catch (e: any) {
      toast({
          variant: "destructive",
          title: "Erreur",
          description: e.message || "Impossible de réinitialiser la démo.",
      });
    } finally {
      setIsResetting(false);
    }
  };

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

        <DashboardStatCards />
        
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
          
          <div className="space-y-6">
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
                  
                  {loadingAlerts ? (
                    <Skeleton className="h-20 w-full" />
                  ) : pendingSchools > 0 && (
                    <div className="p-3 border rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{pendingSchools} nouvelle(s) école(s) en attente</p>
                          <p className="text-sm text-muted-foreground">Validation ou suivi requis pour les écoles en période d'essai.</p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/admin/system/schools">
                            Voir
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gestion de la Démo</CardTitle>
                <CardDescription>Actions pour maintenir l'environnement de démonstration.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Button onClick={handleResetDemo} disabled={isResetting}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {isResetting ? "Réinitialisation..." : "Réinitialiser la période d'essai"}
                 </Button>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
