'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AlertTriangle, CalendarClock, CheckCircle2, Clock, Search, XCircle, BellRing, Send, Loader2,
} from 'lucide-react';
import type { school as School } from '@/lib/data-types';
import { cn } from '@/lib/utils';

type Bucket = 'expired' | 'critical' | 'warning' | 'upcoming' | 'safe';

interface Row {
    id: string;
    name: string;
    plan: string;
    status: string;
    endDate: Date;
    daysLeft: number;
    bucket: Bucket;
    remindersSent?: Partial<Record<'d7' | 'd3' | 'd1' | 'expired' | 'manual', string>>;
}

function bucketize(daysLeft: number): Bucket {
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 3) return 'critical';
    if (daysLeft <= 7) return 'warning';
    if (daysLeft <= 14) return 'upcoming';
    return 'safe';
}

const BUCKET_META: Record<Bucket, { label: string; tone: string; icon: typeof AlertTriangle }> = {
    expired: { label: 'Expirés', tone: 'bg-red-50 text-red-700 border-red-100', icon: XCircle },
    critical: { label: 'Critique (≤ 3 j)', tone: 'bg-orange-50 text-orange-700 border-orange-100', icon: AlertTriangle },
    warning: { label: 'Avertissement (≤ 7 j)', tone: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock },
    upcoming: { label: 'À venir (≤ 14 j)', tone: 'bg-sky-50 text-sky-700 border-sky-100', icon: CalendarClock },
    safe: { label: 'Sains', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
};

function StatCard({ bucket, count }: { bucket: Bucket; count: number }) {
    const meta = BUCKET_META[bucket];
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

function BucketBadge({ bucket }: { bucket: Bucket }) {
    const meta = BUCKET_META[bucket];
    return (
        <Badge variant="outline" className={cn('font-semibold border', meta.tone)}>
            {meta.label.split(' ')[0]}
        </Badge>
    );
}

export function SubscriptionsWatch() {
    const firestore = useFirestore();
    const auth = useAuth();
    const { user } = useUser();
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<Bucket | 'all'>('all');
    const [sendingFor, setSendingFor] = useState<string | null>(null);

    const sendManualReminder = async (schoolId: string) => {
        if (sendingFor) return;
        const current = auth.currentUser;
        if (!current) {
            toast({ variant: 'destructive', title: 'Non authentifié' });
            return;
        }
        setSendingFor(schoolId);
        try {
            const token = await current.getIdToken();
            const res = await fetch(`/api/admin/subscriptions/${schoolId}/remind`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({
                    variant: 'destructive',
                    title: 'Rappel non envoyé',
                    description: body.error || `HTTP ${res.status}`,
                });
                return;
            }
            toast({
                title: 'Rappel envoyé',
                description: body.sentTo
                    ? `Email à ${body.sentTo} + ${body.directorsNotified} notification(s).`
                    : `${body.directorsNotified} notification(s) envoyée(s) (aucun email directeur configuré).`,
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setSendingFor(null);
        }
    };

    const schoolsQuery = useMemo(
        () => (user?.profile?.isAdmin ? query(collection(firestore, 'ecoles')) : null),
        [firestore, user?.profile?.isAdmin],
    );
    const { data, loading } = useCollection(schoolsQuery);

    const rows = useMemo<Row[]>(() => {
        if (!data) return [];
        const now = new Date();
        const result: Row[] = [];
        for (const doc of data) {
            const school = doc.data() as School;
            const sub = school.subscription;
            if (!sub?.endDate) continue;
            const endDate = new Date(sub.endDate);
            if (Number.isNaN(endDate.getTime())) continue;
            const daysLeft = differenceInCalendarDays(endDate, now);
            result.push({
                id: doc.id,
                name: school.name ?? '—',
                plan: sub.plan ?? '—',
                status: sub.status ?? '—',
                endDate,
                daysLeft,
                bucket: bucketize(daysLeft),
                remindersSent: (sub as any).remindersSent,
            });
        }
        return result.sort((a, b) => a.daysLeft - b.daysLeft);
    }, [data]);

    const counts = useMemo(() => {
        const acc: Record<Bucket, number> = { expired: 0, critical: 0, warning: 0, upcoming: 0, safe: 0 };
        rows.forEach(r => { acc[r.bucket] += 1; });
        return acc;
    }, [rows]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return rows.filter(r => {
            if (activeFilter !== 'all' && r.bucket !== activeFilter) return false;
            if (!term) return true;
            return r.name.toLowerCase().includes(term) || r.id.toLowerCase().includes(term);
        });
    }, [rows, search, activeFilter]);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tight">Surveillance des abonnements</h1>
                <p className="text-sm text-muted-foreground">
                    Liste des écoles classées par échéance. Les rappels J-7 / J-3 et les bascules en « expiré » sont automatisés par la fonction <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">subscriptionLifecycle</code>.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
                {(Object.keys(BUCKET_META) as Bucket[]).map(b => (
                    <button
                        key={b}
                        onClick={() => setActiveFilter(activeFilter === b ? 'all' : b)}
                        className={cn(
                            'text-left transition-all rounded-2xl',
                            activeFilter === b && 'ring-2 ring-primary ring-offset-2',
                        )}
                    >
                        <StatCard bucket={b} count={counts[b]} />
                    </button>
                ))}
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Liste de surveillance</CardTitle>
                        <CardDescription>
                            {filtered.length} école{filtered.length > 1 ? 's' : ''}
                            {activeFilter !== 'all' ? ` — filtre : ${BUCKET_META[activeFilter].label}` : ''}
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
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Échéance</TableHead>
                                    <TableHead className="text-right">Jours restants</TableHead>
                                    <TableHead>Niveau</TableHead>
                                    <TableHead>Derniers rappels</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            Aucune école dans cette catégorie.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map(row => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-semibold">{row.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{row.plan}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={row.status === 'active' ? 'secondary' : row.status === 'expired' ? 'destructive' : 'outline'}
                                                    className="capitalize"
                                                >
                                                    {row.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(row.endDate, 'd MMM yyyy', { locale: fr })}
                                            </TableCell>
                                            <TableCell className="text-right font-bold tabular-nums">
                                                {row.daysLeft < 0 ? `${Math.abs(row.daysLeft)} j en retard` : `${row.daysLeft} j`}
                                            </TableCell>
                                            <TableCell><BucketBadge bucket={row.bucket} /></TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div className="flex flex-wrap gap-1">
                                                    {row.remindersSent?.d7 && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                                                            <BellRing className="h-3 w-3" /> J-7 · {row.remindersSent.d7}
                                                        </span>
                                                    )}
                                                    {row.remindersSent?.d3 && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                                            <BellRing className="h-3 w-3" /> J-3 · {row.remindersSent.d3}
                                                        </span>
                                                    )}
                                                    {row.remindersSent?.d1 && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">
                                                            <BellRing className="h-3 w-3" /> J-1 · {row.remindersSent.d1}
                                                        </span>
                                                    )}
                                                    {row.remindersSent?.expired && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                                                            <BellRing className="h-3 w-3" /> Exp · {row.remindersSent.expired}
                                                        </span>
                                                    )}
                                                    {row.remindersSent?.manual && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
                                                            <BellRing className="h-3 w-3" /> Manuel · {row.remindersSent.manual}
                                                        </span>
                                                    )}
                                                    {!row.remindersSent && '—'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => sendManualReminder(row.id)}
                                                    disabled={sendingFor === row.id || row.remindersSent?.manual === format(new Date(), 'yyyy-MM-dd')}
                                                    title={row.remindersSent?.manual === format(new Date(), 'yyyy-MM-dd') ? 'Déjà envoyé aujourd\'hui' : 'Envoyer un rappel maintenant'}
                                                >
                                                    {sendingFor === row.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Send className="h-3.5 w-3.5" />
                                                    )}
                                                    <span className="ml-1.5">Rappel</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
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
        </div>
    );
}
