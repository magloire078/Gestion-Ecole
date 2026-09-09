// src/app/admin/system/admins/page.tsx
'use client';

import { useState } from 'react';
import { AdminsTable } from "@/components/admin/admins-table";
import { CommercialAccessTable } from "@/components/admin/commercial-access-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Users, Target, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminsPage() {
    const [tab, setTab] = useState<'admins' | 'commercials' | 'roles'>('admins');

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    Administration & Équipe
                </h1>
                <p className="text-sm text-slate-500">
                    Gérez les accès administrateurs globaux, l'équipe commerciale CRM et les permissions de la plateforme.
                </p>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-auto gap-1 border border-slate-200">
                    <TabsTrigger
                        value="admins"
                        className="rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Administrateurs Système</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="commercials"
                        className="rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                    >
                        <Target className="h-4 w-4" />
                        <span>Équipe Commerciale (CRM)</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="roles"
                        className="rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                    >
                        <Lock className="h-4 w-4" />
                        <span>Matrice des Rôles & Sécurité</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="admins" className="m-0 focus-visible:outline-none">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        <AdminsTable />
                    </motion.div>
                </TabsContent>

                <TabsContent value="commercials" className="m-0 focus-visible:outline-none">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        <CommercialAccessTable />
                    </motion.div>
                </TabsContent>

                <TabsContent value="roles" className="m-0 focus-visible:outline-none">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="rounded-2xl border-white/60 bg-white/40 backdrop-blur-xl shadow-xl">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-black text-slate-900">Super Administrateur</CardTitle>
                                            <CardDescription>Accès intégral à toute la plateforme</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Gestion globale de toutes les écoles et abonnements</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Création et révocation des comptes administrateurs</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Accès aux journaux d'audit et paramètres système</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Accès au pipeline prospects & CRM commercial</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-white/60 bg-white/40 backdrop-blur-xl shadow-xl">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            <Target className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-black text-slate-900">Rôle Commercial (CRM)</CardTitle>
                                            <CardDescription>Périmètre strictement dédié à la prospection</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Accès complet au pipeline de prospection & CRM</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Création, qualification et mise à jour des prospects</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Téléchargement des fiches d'inscription imprimables</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                                        <span className="line-through">Pas d'accès aux données privées des écoles abonnées</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                                        <span className="line-through">Pas d'accès aux finances système ni paramètres</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
