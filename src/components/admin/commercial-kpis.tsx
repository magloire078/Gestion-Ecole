'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import {
    Banknote, CalendarClock, Loader2, Percent, RefreshCw, School, TrendingDown, TrendingUp,
    Sparkles, ArrowUpRight, ShieldCheck, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface KpisPayload {
    generatedAt: string;
    totals: {
        schools: number;
        active: number;
        trialing: number;
        pastDue: number;
        expired: number;
        canceled: number;
    };
    conversionRate: number | null;
    mrr: {
        total: number;
        byPlan: Record<string, { schools: number; students: number; mrr: number }>;
    };
    signupsByMonth: { key: string; label: string; count: number }[];
    expiring30: number;
    lost90: number;
}

function formatFcfa(amount: number): string {
    return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} FCFA`;
}

function StatTile({ label, value, hint, icon: Icon, tone }: {
    label: string;
    value: string;
    hint?: string;
    icon: typeof Banknote;
    tone?: string;
}) {
    return (
        <div className={cn('rounded-2xl border bg-white/60 backdrop-blur-md p-4 shadow-sm hover:shadow-md transition-all', tone)}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
                <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500 font-medium">{hint}</p>}
        </div>
    );
}

export function CommercialKpis() {
    const auth = useAuth();
    const { user } = useUser();
    const { toast } = useToast();
    const [data, setData] = useState<KpisPayload | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        const current = auth.currentUser;
        if (!current) return;
        setLoading(true);
        try {
            const token = await current.getIdToken();
            const res = await fetch('/api/admin/kpis', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Chargement impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            setData(body);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setLoading(false);
        }
    }, [auth, toast]);

    useEffect(() => {
        if (user?.profile?.isAdmin && data === null && !loading) {
            load();
        }
    }, [user?.profile?.isAdmin, data, loading, load]);

    const chartData = useMemo(() => (data?.signupsByMonth ?? []).map(m => ({
        ...m,
        monthLabel: format(parse(m.key, 'yyyy-MM', new Date()), 'MMM yy', { locale: fr }),
    })), [data?.signupsByMonth]);

    const plans = useMemo(() => {
        const entries = Object.entries(data?.mrr.byPlan ?? {});
        return entries.sort((a, b) => b[1].mrr - a[1].mrr);
    }, [data?.mrr.byPlan]);

    if (data === null) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">KPIs Commerciaux & Revenus</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Revenu récurrent (MRR), conversion et dynamique des souscriptions — calculés en direct sur les {data.totals.schools} écoles.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl border-slate-200">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1.5 font-bold">Actualiser</span>
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatTile
                    label="MRR estimé"
                    value={formatFcfa(data.mrr.total)}
                    hint="Revenu mensuel récurrent (écoles actives)"
                    icon={Banknote}
                    tone="border-emerald-200 bg-emerald-50/40"
                />
                <StatTile
                    label="Conversion"
                    value={data.conversionRate !== null ? `${data.conversionRate} %` : '—'}
                    hint="Essai → payant (écoles converties)"
                    icon={Percent}
                    tone="border-blue-200 bg-blue-50/40"
                />
                <StatTile
                    label="Écoles actives"
                    value={String(data.totals.active)}
                    hint={`${data.totals.pastDue} en impayé`}
                    icon={School}
                />
                <StatTile
                    label="En essai"
                    value={String(data.totals.trialing)}
                    hint="Conversions potentielles en cours"
                    icon={TrendingUp}
                    tone="border-amber-200 bg-amber-50/40"
                />
                <StatTile
                    label="Échéance ≤ 30 j"
                    value={String(data.expiring30)}
                    hint="Renouvellements à sécuriser"
                    icon={CalendarClock}
                />
                <StatTile
                    label="Perdues (90 j)"
                    value={String(data.lost90)}
                    hint="Expirées ou résiliées récemment"
                    icon={TrendingDown}
                    tone="border-rose-200 bg-rose-50/40"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 rounded-2xl border-white/60 bg-white/40 backdrop-blur-xl shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-black text-slate-900">Inscriptions & Croissance par mois</CardTitle>
                        <CardDescription>
                            Nouvelles écoles créées sur les 12 derniers mois.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 w-full">
                            <ChartContainer
                                config={{ count: { label: 'Inscriptions', color: '#2563eb' } }}
                                className="h-full w-full"
                            >
                                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200" />
                                    <XAxis
                                        dataKey="monthLabel"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        interval={1}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="rounded-xl border bg-white p-3 shadow-xl">
                                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
                                                        <p className="text-sm font-black tabular-nums text-blue-600">
                                                            {payload[0].value} inscription{Number(payload[0].value) > 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill="#2563eb"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={32}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-white/60 bg-white/40 backdrop-blur-xl shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-lg font-black text-slate-900">MRR par formule</CardTitle>
                        <CardDescription>
                            Répartition du revenu mensuel estimé.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {plans.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                Aucune école active pour le moment.
                            </p>
                        ) : (
                            plans.map(([plan, info]) => (
                                <div key={plan} className="rounded-xl border border-slate-200/80 bg-white/60 p-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="font-bold text-slate-700 bg-white">{plan}</Badge>
                                        <span className="text-sm font-black tabular-nums text-slate-900">{formatFcfa(info.mrr)}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {info.schools} école{info.schools > 1 ? 's' : ''} · {info.students} élève{info.students > 1 ? 's' : ''}
                                    </p>
                                </div>
                            ))
                        )}
                        <p className="text-[11px] text-slate-400 pt-2">
                            Calculé à {format(new Date(data.generatedAt), 'HH:mm', { locale: fr })}.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/40 backdrop-blur-md p-4 text-sm shadow-sm">
                    <p className="font-black text-slate-900">Statuts d'abonnement</p>
                    <p className="mt-1.5 text-slate-600">
                        {data.totals.active} actives · {data.totals.trialing} en essai · {data.totals.pastDue} en impayé · {data.totals.expired} expirées · {data.totals.canceled} résiliées
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/40 backdrop-blur-md p-4 text-sm shadow-sm">
                    <p className="font-black text-slate-900">Priorités de la semaine</p>
                    <p className="mt-1.5 text-slate-600">
                        {data.expiring30} école{data.expiring30 > 1 ? 's' : ''} à échéance sous 30 jours et {data.totals.pastDue} en impayé à relancer pour sécuriser les renouvellements.
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/40 backdrop-blur-md p-4 text-sm shadow-sm">
                    <p className="font-black text-slate-900">Dynamique commerciale</p>
                    <p className="mt-1.5 text-slate-600">
                        {chartData.slice(-3).reduce((sum, m) => sum + m.count, 0)} inscriptions sur le dernier trimestre — les {data.totals.trialing} essais constituent vos prochaines conversions.
                    </p>
                </div>
            </div>
        </div>
    );
}
