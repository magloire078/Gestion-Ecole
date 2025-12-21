
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Server,
  Bell,
} from 'lucide-react';
import { SystemMetrics } from '@/components/admin/system-metrics';
import { AuditLog } from '@/components/admin/audit-log';
import { DashboardStatCards } from '@/components/admin/dashboard-stat-cards';


export default function SystemAdminDashboard() {
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
