'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Check, ChevronDown, Inbox, Loader2, Mail, RefreshCw, ThumbsDown, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProposedAction {
    kind: 'email' | 'none';
    to?: string;
    subject?: string;
    body?: string;
}

interface Decision {
    id: string;
    type: string;
    title: string;
    description: string;
    schoolId: string | null;
    schoolName: string | null;
    source: string;
    status: 'pending' | 'approved' | 'rejected' | 'failed';
    proposedAction: ProposedAction;
    createdAt: string | null;
    decidedAt: string | null;
    decidedByEmail: string | null;
    decisionNote: string | null;
    executionResult: string | null;
}

const TYPE_LABELS: Record<string, string> = {
    silent_churn: 'Churn silencieux',
    past_due_call: 'Impayé',
    custom: 'Autre',
};

const STATUS_META: Record<string, { label: string; tone: string }> = {
    approved: { label: 'Approuvée', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    rejected: { label: 'Refusée', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    failed: { label: 'Échec', tone: 'bg-red-50 text-red-700 border-red-100' },
};

function PendingCard({ decision, onDecide, deciding }: {
    decision: Decision;
    onDecide: (decision: Decision, choice: 'approve' | 'reject', note: string) => void;
    deciding: boolean;
}) {
    const [note, setNote] = useState('');
    const action = decision.proposedAction;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-semibold">
                        {TYPE_LABELS[decision.type] ?? decision.type}
                    </Badge>
                    <CardTitle className="text-base">{decision.title}</CardTitle>
                </div>
                <CardDescription>
                    Proposé par <span className="font-semibold">{decision.source}</span>
                    {decision.createdAt && ` · ${format(new Date(decision.createdAt), 'd MMM yyyy à HH:mm', { locale: fr })}`}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm">{decision.description}</p>

                {action.kind === 'email' && (
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                Voir l&apos;email qui sera envoyé
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="mt-3 rounded-xl border bg-slate-50/60 p-4 text-sm dark:bg-white/5">
                                <p className="text-xs text-muted-foreground">À : <span className="font-semibold text-foreground">{action.to}</span></p>
                                <p className="mt-1 text-xs text-muted-foreground">Objet : <span className="font-semibold text-foreground">{action.subject}</span></p>
                                <p className="mt-3 whitespace-pre-wrap">{action.body}</p>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )}
                {action.kind === 'none' && (
                    <p className="text-xs text-muted-foreground">
                        Aucune action automatique : approuver enregistre simplement la décision (et votre note) dans l&apos;historique.
                    </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Note de décision (optionnel)…"
                        className="sm:flex-1"
                    />
                    <div className="flex shrink-0 gap-2">
                        <Button
                            size="sm"
                            onClick={() => onDecide(decision, 'approve', note)}
                            disabled={deciding}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {deciding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            <span className="ml-1">Approuver</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDecide(decision, 'reject', note)}
                            disabled={deciding}
                        >
                            <X className="h-4 w-4" />
                            <span className="ml-1">Refuser</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function DecisionQueue() {
    const auth = useAuth();
    const { user } = useUser();
    const { toast } = useToast();
    const [pending, setPending] = useState<Decision[] | null>(null);
    const [decided, setDecided] = useState<Decision[]>([]);
    const [loading, setLoading] = useState(false);
    const [decidingId, setDecidingId] = useState<string | null>(null);

    const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
        const current = auth.currentUser;
        if (!current) throw new Error('Non authentifié');
        const token = await current.getIdToken();
        return fetch(url, {
            ...init,
            headers: {
                ...(init?.headers ?? {}),
                Authorization: `Bearer ${token}`,
                ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            },
        });
    }, [auth]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authedFetch('/api/admin/decisions');
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Chargement impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            setPending(body.pending ?? []);
            setDecided(body.decided ?? []);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setLoading(false);
        }
    }, [authedFetch, toast]);

    useEffect(() => {
        if (user?.profile?.isAdmin && pending === null && !loading) {
            load();
        }
    }, [user?.profile?.isAdmin, pending, loading, load]);

    const decide = async (decision: Decision, choice: 'approve' | 'reject', note: string) => {
        if (decidingId) return;
        setDecidingId(decision.id);
        try {
            const res = await authedFetch(`/api/admin/decisions/${decision.id}`, {
                method: 'POST',
                body: JSON.stringify({ decision: choice, note: note || null }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Décision impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            toast({
                title: choice === 'approve' ? 'Décision approuvée' : 'Décision refusée',
                description: body.executionResult ?? undefined,
            });
            await load();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setDecidingId(null);
        }
    };

    const stats = useMemo(() => ({
        pending: (pending ?? []).length,
        approved: decided.filter(d => d.status === 'approved').length,
        rejected: decided.filter(d => d.status === 'rejected').length,
    }), [pending, decided]);

    if (pending === null) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Boîte de décisions</h1>
                    <p className="text-sm text-muted-foreground">
                        Les automatisations détectent les situations et préparent l&apos;action ; rien ne part sans votre
                        validation. Approuver exécute l&apos;action proposée et la trace dans le journal CRM.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1.5">Actualiser</span>
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-amber-50 p-4 text-amber-700 border-amber-100">
                    <span className="text-xs font-bold uppercase tracking-wider">En attente</span>
                    <p className="mt-2 text-3xl font-black">{stats.pending}</p>
                </div>
                <div className="rounded-2xl border bg-emerald-50 p-4 text-emerald-700 border-emerald-100">
                    <span className="text-xs font-bold uppercase tracking-wider">Approuvées (50 dern.)</span>
                    <p className="mt-2 text-3xl font-black">{stats.approved}</p>
                </div>
                <div className="rounded-2xl border bg-slate-50 p-4 text-slate-600 border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider">Refusées (50 dern.)</span>
                    <p className="mt-2 text-3xl font-black">{stats.rejected}</p>
                </div>
            </div>

            {pending.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                        <Inbox className="h-8 w-8 text-muted-foreground" />
                        <p className="font-semibold">Aucune décision en attente</p>
                        <p className="max-w-md text-sm text-muted-foreground">
                            Le détecteur tourne chaque matin (06h30) : churn silencieux et impayés y déposeront
                            leurs propositions, prêtes à approuver ou refuser.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {pending.map(d => (
                        <PendingCard
                            key={d.id}
                            decision={d}
                            onDecide={decide}
                            deciding={decidingId === d.id}
                        />
                    ))}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Historique</CardTitle>
                    <CardDescription>Les 50 dernières décisions traitées.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Décision</TableHead>
                                    <TableHead>École</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Résultat</TableHead>
                                    <TableHead>Par</TableHead>
                                    <TableHead>Quand</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {decided.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                                            Aucune décision traitée pour le moment.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    decided.map(d => {
                                        const meta = STATUS_META[d.status] ?? STATUS_META.rejected;
                                        return (
                                            <TableRow key={d.id}>
                                                <TableCell className="max-w-[260px]">
                                                    <p className="truncate font-semibold" title={d.title}>{d.title}</p>
                                                    {d.decisionNote && (
                                                        <p className="truncate text-xs text-muted-foreground" title={d.decisionNote}>
                                                            <ThumbsDown className="mr-1 inline h-3 w-3 rotate-180" />
                                                            {d.decisionNote}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">{d.schoolName ?? '—'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn('font-semibold border', meta.tone)}>
                                                        {meta.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[220px]">
                                                    <p className="truncate text-xs text-muted-foreground" title={d.executionResult ?? ''}>
                                                        {d.executionResult ?? '—'}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{d.decidedByEmail ?? '—'}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {d.decidedAt ? format(new Date(d.decidedAt), 'd MMM HH:mm', { locale: fr }) : '—'}
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
        </div>
    );
}
