
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, RefreshCw, ArrowRight, Settings, Users, Shield, Activity } from 'lucide-react';
import { AuditLog } from '@/components/admin/audit-log';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { resetDemoTrial } from '@/services/school-services';
import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import Link from 'next/link';

import { SystemStats } from '@/components/admin/system-stats';
import { PlanDistributionChart } from '@/components/admin/plan-distribution-chart';
import { RecentSchoolsList } from '@/components/admin/recent-schools-list';

export default function SystemAdminDashboard() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isResetting, setIsResetting] = useState(false);

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
                    <p className="text-muted-foreground">Vue d&apos;ensemble de la santé et des métriques de la plateforme.</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Server className="h-3 w-3 mr-1" />
                    Production
                </Badge>
            </div>

            <SystemStats />

            {/* Quick Actions Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            Gérer Admins
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start">
                            <Link href="/admin/system/admins">
                                Accéder
                                <ArrowRight className="ml-auto h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Shield className="h-4 w-4 text-emerald-600" />
                            Écoles
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start">
                            <Link href="/admin/system/schools">
                                Voir toutes
                                <ArrowRight className="ml-auto h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="h-4 w-4 text-orange-600" />
                            Logs d&apos;Audit
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start">
                            <Link href="/admin/system/audit-log">
                                Consulter
                                <ArrowRight className="ml-auto h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Settings className="h-4 w-4 text-purple-600" />
                            Paramètres
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="ghost" size="sm" className="w-full justify-start">
                            <Link href="/admin/system/settings">
                                Configurer
                                <ArrowRight className="ml-auto h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <RecentSchoolsList />
                    <Card>
                        <CardHeader>
                            <CardTitle>Activité récente</CardTitle>
                            <CardDescription>Dernières actions critiques sur le système.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AuditLog limit={10} />
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="secondary" className="w-full">
                                <Link href="/admin/system/audit-log">
                                    Voir tous les journaux
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <PlanDistributionChart />
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestion de la Démo</CardTitle>
                            <CardDescription>Actions pour maintenir l&apos;environnement de démonstration.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleResetDemo} disabled={isResetting} className="w-full">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {isResetting ? "Réinitialisation..." : "Réinitialiser la période d&apos;essai"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

