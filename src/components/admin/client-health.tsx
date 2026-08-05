'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-base';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Activity, AlertTriangle, CheckCircle2, Eye, HeartPulse, Loader2, Mail, NotebookPen, Phone, RefreshCw, Search, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InteractionJournalSheet } from '@/components/admin/interaction-journal';

type Risk = 'at_risk' | 'watch' | 'healthy';

interface HealthRow {
    id: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    daysLeft: number | null;
    students: number;
    classes: number;
    staff: number;
    isSetupComplete: boolean;
    lastActivityDays: number | null;
    lastPaymentDays: number | null;
    score: number;
    breakdown: { setup: number; adoption: number; activity: number; subscription: number };
    risk: Risk;
    directorEmail: string | null;
    directorPhone: string | null;
}

const RISK_META: Record<Risk, { label: string; tone: string; icon: typeof AlertTriangle }> = {
    at_risk: { label: 'À risque', tone: 'bg-red-50 text-red-700 border-red-100', icon: AlertTriangle },
    watch: { label: 'À surveiller', tone: 'bg-amber-50 text-amber-700 border-amber-100', icon: Eye },
    healthy: { label: 'Sains', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
};

function StatCard({ risk, count }: { risk: Risk; count: number }) {
    const meta = RISK_META[risk];
    const Icon = meta.icon;
    return (
        <div className={cn('rounded-2xl border p-4', meta.tone)}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">{meta.label}</span>
                <Icon className="h-4 w-4" />
            </div>
            <p className="mt-2 text-3xl font-black">{count}</p>
        </div>
    );
}

function ScoreBadge({ score }: { score: number }) {
    const tone = score >= 70
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : score >= 45
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-red-50 text-red-700 border-red-100';
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-black tabular-nums', tone)}>
            <HeartPulse className="h-3.5 w-3.5" />
            {score}
        </span>
    );
}

function formatDays(days: number | null): string {
    if (days === null) return 'Jamais';
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    return `Il y a ${days} j`;
}

function activityTone(days: number | null): string {
    if (days === null) return 'text-red-600';
    if (days <= 7) return 'text-emerald-600';
    if (days <= 30) return 'text-amber-600';
    return 'text-red-600';
}

export function ClientHealth() {
    const auth = useAuth();
    const { user } = useUser();
    const { toast } = useToast();
    const [rows, setRows] = useState<HealthRow[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<Risk | 'all'>('all');
    const [journalFor, setJournalFor] = useState<{ id: string; name: string } | null>(null);

    const load = useCallback(async () => {
        const current = auth.currentUser;
        if (!current) return;
        setLoading(true);
        try {
            const token = await current.getIdToken();
            const res = await fetch(apiUrl('/api/admin/health'), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({
                    variant: 'destructive',
                    title: 'Chargement impossible',
                    description: body.error || `HTTP ${res.status}`,
                });
                return;
            }
            setRows(body.rows ?? []);
            setGeneratedAt(body.generatedAt ?? null);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setLoading(false);
        }
    }, [auth, toast]);

    useEffect(() => {
        if (user?.profile?.isAdmin && rows === null && !loading) {
            load();
        }
    }, [user?.profile?.isAdmin, rows, loading, load]);

    const counts = useMemo(() => {
        const acc: Record<Risk, number> = { at_risk: 0, watch: 0, healthy: 0 };
        (rows ?? []).forEach(r => { acc[r.risk] += 1; });
        return acc;
    }, [rows]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return (rows ?? []).filter(r => {
            if (activeFilter !== 'all' && r.risk !== activeFilter) return false;
            if (!term) return true;
            return r.name.toLowerCase().includes(term) || r.id.toLowerCase().includes(term);
        });
    }, [rows, search, activeFilter]);

    if (rows === null) {
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
                    <h1 className="text-3xl font-black tracking-tight">Suivi clients</h1>
                    <p className="text-sm text-muted-foreground">
                        Score de santé par école, calculé sur la configuration, l&apos;adoption (élèves, classes, personnel),
                        l&apos;activité récente et l&apos;état de l&apos;abonnement. Les écoles les plus à risque apparaissent en premier.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1.5">Actualiser</span>
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                {(Object.keys(RISK_META) as Risk[]).map(r => (
                    <button
                        key={r}
                        onClick={() => setActiveFilter(activeFilter === r ? 'all' : r)}
                        className={cn(
                            'text-left transition-all rounded-2xl',
                            activeFilter === r && 'ring-2 ring-primary ring-offset-2',
                        )}
                    >
                        <StatCard risk={r} count={counts[r]} />
                    </button>
                ))}
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Santé des écoles</CardTitle>
                        <CardDescription>
                            {filtered.length} école{filtered.length > 1 ? 's' : ''}
                            {activeFilter !== 'all' ? ` — filtre : ${RISK_META[activeFilter].label}` : ''}
                            {generatedAt ? ` — calculé à ${new Date(generatedAt).toLocaleTimeString('fr-FR')}` : ''}
                        </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher une école…"
                            className="pl-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>École</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Niveau</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Abonnement</TableHead>
                                    <TableHead className="text-right">Élèves</TableHead>
                                    <TableHead className="text-right">Classes</TableHead>
                                    <TableHead>Dernière activité</TableHead>
                                    <TableHead>Dernier paiement</TableHead>
                                    <TableHead className="text-right">Contact</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                            Aucune école dans cette catégorie.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map(row => {
                                        const riskMeta = RISK_META[row.risk];
                                        return (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-semibold">
                                                    {row.name}
                                                    {!row.isSetupComplete && (
                                                        <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                            Config incomplète
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <ScoreBadge score={row.score} />
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn('font-semibold border', riskMeta.tone)}>
                                                        {riskMeta.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{row.plan}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        <Badge
                                                            variant={row.subscriptionStatus === 'active' ? 'secondary' : 'outline'}
                                                            className="capitalize w-fit"
                                                        >
                                                            {row.subscriptionStatus}
                                                        </Badge>
                                                        {row.daysLeft !== null && (
                                                            <span className={cn(
                                                                'text-xs tabular-nums',
                                                                row.daysLeft < 0 ? 'text-red-600 font-bold' : 'text-muted-foreground',
                                                            )}>
                                                                {row.daysLeft < 0
                                                                    ? `Expiré depuis ${Math.abs(row.daysLeft)} j`
                                                                    : `${row.daysLeft} j restants`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold tabular-nums">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {row.students}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{row.classes}</TableCell>
                                                <TableCell>
                                                    <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', activityTone(row.lastActivityDays))}>
                                                        <Activity className="h-3.5 w-3.5" />
                                                        {formatDays(row.lastActivityDays)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={cn('text-sm font-semibold', activityTone(row.lastPaymentDays))}>
                                                        {formatDays(row.lastPaymentDays)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                            title="Journal de suivi"
                                                            onClick={() => setJournalFor({ id: row.id, name: row.name })}
                                                        >
                                                            <NotebookPen className="h-4 w-4" />
                                                        </Button>
                                                        {row.directorEmail && (
                                                            <Button asChild size="icon" variant="ghost" className="h-8 w-8" title={`Écrire à ${row.directorEmail}`}>
                                                                <a href={`mailto:${row.directorEmail}`}>
                                                                    <Mail className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                        {row.directorPhone && (
                                                            <Button asChild size="icon" variant="ghost" className="h-8 w-8" title={`Appeler ${row.directorPhone}`}>
                                                                <a href={`tel:${row.directorPhone}`}>
                                                                    <Phone className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {activeFilter !== 'all' && (
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setActiveFilter('all')}>
                        Réinitialiser le filtre
                    </Button>
                </div>
            )}

            <InteractionJournalSheet
                schoolId={journalFor?.id ?? null}
                schoolName={journalFor?.name ?? ''}
                open={journalFor !== null}
                onOpenChange={isOpen => { if (!isOpen) setJournalFor(null); }}
            />
        </div>
    );
}
