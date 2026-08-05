'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-base';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <div className={cn('rounded-2xl border bg-white/50 p-4 dark:bg-white/5', tone)}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
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
            const res = await fetch(apiUrl('/api/admin/kpis'), {
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
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">KPIs commerciaux</h1>
                    <p className="text-sm text-muted-foreground">
                        Revenu récurrent, conversion et dynamique des inscriptions — calculés en direct sur les données
                        des {data.totals.schools} écoles de la plateforme.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1.5">Actualiser</span>
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatTile
                    label="MRR estimé"
                    value={formatFcfa(data.mrr.total)}
                    hint="Revenu mensuel récurrent (écoles actives)"
                    icon={Banknote}
                />
                <StatTile
                    label="Conversion"
                    value={data.conversionRate !== null ? `${data.conversionRate} %` : '—'}
                    hint="Essai → payant (écoles sorties d'essai)"
                    icon={Percent}
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
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Inscriptions par mois</CardTitle>
                        <CardDescription>
                            Nouvelles écoles créées sur les 12 derniers mois.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 w-full">
                            <ChartContainer
                                config={{ count: { label: 'Inscriptions', color: 'hsl(var(--chart-2))' } }}
                                className="h-full w-full"
                            >
                                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis
                                        dataKey="monthLabel"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 11 }}
                                        interval={1}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="rounded-xl border bg-background p-3 shadow-xl">
                                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                                                        <p className="text-sm font-black tabular-nums">
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
                                        fill="hsl(var(--chart-2))"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={28}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>MRR par plan</CardTitle>
                        <CardDescription>
                            Répartition du revenu mensuel estimé.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {plans.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aucune école active pour le moment.
                            </p>
                        ) : (
                            plans.map(([plan, info]) => (
                                <div key={plan} className="rounded-xl border p-3">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="font-semibold">{plan}</Badge>
                                        <span className="text-sm font-black tabular-nums">{formatFcfa(info.mrr)}</span>
                                    </div>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {info.schools} école{info.schools > 1 ? 's' : ''} · {info.students} élève{info.students > 1 ? 's' : ''}
                                    </p>
                                </div>
                            ))
                        )}
                        <p className="text-[11px] text-muted-foreground">
                            Estimation : tarif par élève du plan + modules actifs facturés. Calculé à {format(new Date(data.generatedAt), 'HH:mm', { locale: fr })}.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-slate-50/50 p-4 text-sm dark:bg-white/5">
                    <p className="font-bold">Statuts d&apos;abonnement</p>
                    <p className="mt-1 text-muted-foreground">
                        {data.totals.active} actives · {data.totals.trialing} en essai · {data.totals.pastDue} en impayé · {data.totals.expired} expirées · {data.totals.canceled} résiliées
                    </p>
                </div>
                <div className="rounded-2xl border bg-slate-50/50 p-4 text-sm dark:bg-white/5">
                    <p className="font-bold">Où agir en priorité</p>
                    <p className="mt-1 text-muted-foreground">
                        Les {data.expiring30} écoles à échéance sous 30 jours et les {data.totals.pastDue} en impayé sont vos renouvellements à sécuriser cette semaine.
                    </p>
                </div>
                <div className="rounded-2xl border bg-slate-50/50 p-4 text-sm dark:bg-white/5">
                    <p className="font-bold">Croissance</p>
                    <p className="mt-1 text-muted-foreground">
                        {chartData.slice(-3).reduce((sum, m) => sum + m.count, 0)} inscriptions sur les 3 derniers mois — les {data.totals.trialing} essais en cours sont vos prochaines conversions.
                    </p>
                </div>
            </div>
        </div>
    );
}
