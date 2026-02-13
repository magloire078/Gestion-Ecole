
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, RefreshCw, ArrowRight, Settings, Users, Shield, Activity, Globe } from 'lucide-react';
import { AuditLog } from '@/components/admin/audit-log';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { resetDemoTrial } from '@/services/school-services';
import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';

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
        <div className="space-y-10 relative">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div>
                    <h1 className="text-4xl font-black text-[#0C365A] font-outfit tracking-tighter">
                        Système Console
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Surveillance globale et contrôle de l'infrastructure GéreEcole.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-2xl border border-green-100/50">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-bold text-green-700 uppercase tracking-widest">
                        Infrastructure Live
                    </span>
                </div>
            </motion.div>

            <SystemStats />

            {/* Quick Actions Section */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Actions Prioritaires</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: "Adm. Plateforme", icon: Users, color: "text-blue-500", bg: "bg-blue-50", link: "/admin/system/admins", label: "Gérer" },
                        { title: "Écoles Gérées", icon: Shield, color: "text-emerald-500", bg: "bg-emerald-50", link: "/admin/system/schools", label: "Voir" },
                        { title: "Sécurité & Audit", icon: Activity, color: "text-orange-500", bg: "bg-orange-50", link: "/admin/system/audit-log", label: "Explorer" },
                        { title: "Configuration", icon: Settings, color: "text-purple-500", bg: "bg-purple-50", link: "/admin/system/settings", label: "Éditer" }
                    ].map((action, idx) => (
                        <Link key={idx} href={action.link}>
                            <motion.div
                                whileHover={{ y: -5 }}
                                className="h-full bg-white rounded-[32px] border border-blue-50/50 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden"
                            >
                                <AnimatedHighlight delay={idx * 0.5} />
                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", action.bg, action.color)}>
                                    <action.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#0C365A] mb-1">{action.title}</h4>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-[#2D9CDB] transition-colors">
                                        {action.label} <ArrowRight className="inline h-3 w-3 ml-1" />
                                    </span>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <RecentSchoolsList />

                    <Card className="rounded-[40px] border-blue-50/50 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl font-black text-[#0C365A] font-outfit tracking-tight">Activité Critique</CardTitle>
                                    <CardDescription className="text-slate-500 font-medium">Dernières actions sur le noyau système.</CardDescription>
                                </div>
                                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                                    <Scroll className="h-6 w-6" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-8 pb-0">
                            <AuditLog limit={8} />
                        </CardContent>
                        <CardFooter className="p-8">
                            <Button asChild variant="outline" className="w-full h-12 rounded-2xl border-blue-100 text-[#0C365A] font-bold hover:bg-blue-50 transition-all">
                                <Link href="/admin/system/audit-log" className="flex items-center justify-center gap-2">
                                    Consulter l'historique complet
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-8">
                    <PlanDistributionChart />

                    <Card className="rounded-[40px] border-blue-50/50 shadow-xl shadow-blue-900/5 overflow-hidden bg-[#0C365A] text-white">
                        <CardHeader className="p-8">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#2D9CDB] mb-4">
                                <RefreshCw className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-2xl font-black font-outfit tracking-tight">Maintenance Démo</CardTitle>
                            <CardDescription className="text-white/60 font-medium">Réinitialisation de l'environnement de test public.</CardDescription>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            <Button
                                onClick={handleResetDemo}
                                disabled={isResetting}
                                className="w-full h-14 bg-white text-[#0C365A] hover:bg-blue-50 border-none rounded-2xl font-black transition-all active:scale-95"
                            >
                                {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
                                {isResetting ? "Restauration..." : "Réinitialiser la Démo"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Infrastructure Card */}
                    <Card className="rounded-[40px] border-blue-50/50 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#2D9CDB]">
                                <Globe className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#0C365A]">Edge Network</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase">Multi-region Firebase</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: "Database", status: "Optimal", val: 100 },
                                { label: "Storage", status: "98.2%", val: 98 },
                                { label: "Auth API", status: "Healthy", val: 100 }
                            ].map((s, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-slate-500">{s.label}</span>
                                        <span className="text-[#2D9CDB]">{s.status}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${s.val}%` }}
                                            className="h-full bg-gradient-to-r from-[#2D9CDB] to-[#0C365A]"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

