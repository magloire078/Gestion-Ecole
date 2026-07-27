'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlarmClock, Check, ListTodo, Loader2, Mail, Phone, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlannedAction {
    source: 'client' | 'prospect';
    id: string;
    name: string;
    date: string;
    note: string | null;
    contact: { phone: string | null; email: string | null };
    overdue: boolean;
}

function ActionRow({ action, onDone, completing }: {
    action: PlannedAction;
    onDone: (action: PlannedAction) => void;
    completing: boolean;
}) {
    return (
        <div className={cn(
            'flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between',
            action.overdue && 'border-red-200 bg-red-50/50 dark:bg-red-950/20',
        )}>
            <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant="outline"
                        className={cn(
                            'font-semibold border',
                            action.source === 'client'
                                ? 'bg-sky-50 text-sky-700 border-sky-100'
                                : 'bg-violet-50 text-violet-700 border-violet-100',
                        )}
                    >
                        {action.source === 'client' ? 'Client' : 'Prospect'}
                    </Badge>
                    <span className="font-semibold">{action.name}</span>
                    <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-bold tabular-nums',
                        action.overdue ? 'text-red-600' : 'text-amber-700',
                    )}>
                        <AlarmClock className="h-3.5 w-3.5" />
                        {format(new Date(action.date), 'd MMM', { locale: fr })}
                        {action.overdue && ' — en retard'}
                    </span>
                </div>
                {action.note && (
                    <p className="truncate text-xs text-muted-foreground" title={action.note}>{action.note}</p>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
                {action.contact.email && (
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8" title={`Écrire à ${action.contact.email}`}>
                        <a href={`mailto:${action.contact.email}`}>
                            <Mail className="h-4 w-4" />
                        </a>
                    </Button>
                )}
                {action.contact.phone && (
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8" title={`Appeler ${action.contact.phone}`}>
                        <a href={`tel:${action.contact.phone}`}>
                            <Phone className="h-4 w-4" />
                        </a>
                    </Button>
                )}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDone(action)}
                    disabled={completing}
                    title="Marquer comme fait (efface la prochaine action)"
                >
                    {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span className="ml-1">Fait</span>
                </Button>
            </div>
        </div>
    );
}

export function TodaysActions() {
    const auth = useAuth();
    const { user } = useUser();
    const { toast } = useToast();
    const [actions, setActions] = useState<PlannedAction[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [completingKey, setCompletingKey] = useState<string | null>(null);

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
            const res = await authedFetch('/api/admin/actions');
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Chargement impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            setActions(body.actions ?? []);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setLoading(false);
        }
    }, [authedFetch, toast]);

    useEffect(() => {
        if (user?.profile?.isAdmin && actions === null && !loading) {
            load();
        }
    }, [user?.profile?.isAdmin, actions, loading, load]);

    const markDone = async (action: PlannedAction) => {
        const key = `${action.source}:${action.id}`;
        if (completingKey) return;
        setCompletingKey(key);
        try {
            const res = action.source === 'client'
                ? await authedFetch(`/api/admin/crm/${action.id}/interactions`, {
                    method: 'PATCH',
                    body: JSON.stringify({ clearNextAction: true }),
                })
                : await authedFetch(`/api/admin/prospects/${action.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ nextActionDate: null }),
                });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Mise à jour impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            setActions(prev => prev?.filter(a => `${a.source}:${a.id}` !== key) ?? null);
            toast({ title: 'Action marquée comme faite' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setCompletingKey(null);
        }
    };

    const { overdue, upcoming } = useMemo(() => ({
        overdue: (actions ?? []).filter(a => a.overdue),
        upcoming: (actions ?? []).filter(a => !a.overdue),
    }), [actions]);

    if (actions === null) {
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
                    <h1 className="text-3xl font-black tracking-tight">Actions du jour</h1>
                    <p className="text-sm text-muted-foreground">
                        Toutes les prochaines actions planifiées — journal de suivi des clients et pipeline prospects —
                        échues ou prévues dans les 7 prochains jours.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1.5">Actualiser</span>
                </Button>
            </div>

            {actions.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                        <ListTodo className="h-8 w-8 text-muted-foreground" />
                        <p className="font-semibold">Aucune action planifiée</p>
                        <p className="max-w-md text-sm text-muted-foreground">
                            Planifiez vos relances en renseignant une « prochaine action » dans le journal de suivi
                            d&apos;une école ou sur un prospect : elles apparaîtront ici chaque matin.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {overdue.length > 0 && (
                        <Card className="border-red-200">
                            <CardHeader>
                                <CardTitle className="text-red-700">En retard ({overdue.length})</CardTitle>
                                <CardDescription>
                                    Actions dont la date est dépassée — à traiter en premier.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {overdue.map(a => (
                                    <ActionRow
                                        key={`${a.source}:${a.id}`}
                                        action={a}
                                        onDone={markDone}
                                        completing={completingKey === `${a.source}:${a.id}`}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>À venir — 7 prochains jours ({upcoming.length})</CardTitle>
                            <CardDescription>
                                Relances planifiées, triées par date.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {upcoming.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Rien de planifié sur les 7 prochains jours.</p>
                            ) : (
                                upcoming.map(a => (
                                    <ActionRow
                                        key={`${a.source}:${a.id}`}
                                        action={a}
                                        onDone={markDone}
                                        completing={completingKey === `${a.source}:${a.id}`}
                                    />
                                ))
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
