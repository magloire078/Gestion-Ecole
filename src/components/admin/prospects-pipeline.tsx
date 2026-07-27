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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    CalendarClock, Handshake, Loader2, Mail, Phone, PhoneCall, Plus, Presentation, RefreshCw, Search, Trash2, TrendingUp, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Stage = 'contacte' | 'demo' | 'essai' | 'converti' | 'perdu';

interface Prospect {
    id: string;
    schoolName: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    stage: Stage;
    notes: string | null;
    nextActionDate: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

const STAGE_META: Record<Stage, { label: string; tone: string; icon: typeof PhoneCall }> = {
    contacte: { label: 'Contactés', tone: 'bg-sky-50 text-sky-700 border-sky-100', icon: PhoneCall },
    demo: { label: 'Démo', tone: 'bg-violet-50 text-violet-700 border-violet-100', icon: Presentation },
    essai: { label: 'En essai', tone: 'bg-amber-50 text-amber-700 border-amber-100', icon: TrendingUp },
    converti: { label: 'Convertis', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: Handshake },
    perdu: { label: 'Perdus', tone: 'bg-red-50 text-red-700 border-red-100', icon: XCircle },
};

const EMPTY_FORM = {
    schoolName: '',
    contactName: '',
    phone: '',
    email: '',
    city: '',
    stage: 'contacte' as Stage,
    notes: '',
    nextActionDate: '',
};

function StatCard({ stage, count }: { stage: Stage; count: number }) {
    const meta = STAGE_META[stage];
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

export function ProspectsPipeline() {
    const auth = useAuth();
    const { user } = useUser();
    const { toast } = useToast();
    const [prospects, setProspects] = useState<Prospect[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<Stage | 'all'>('all');
    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Prospect | null>(null);

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
            const res = await authedFetch('/api/admin/prospects');
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Chargement impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            setProspects(body.prospects ?? []);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setLoading(false);
        }
    }, [authedFetch, toast]);

    useEffect(() => {
        if (user?.profile?.isAdmin && prospects === null && !loading) {
            load();
        }
    }, [user?.profile?.isAdmin, prospects, loading, load]);

    const createProspect = async () => {
        if (!form.schoolName.trim()) {
            toast({ variant: 'destructive', title: 'Nom requis', description: 'Indiquez le nom de l\'école prospectée.' });
            return;
        }
        setSaving(true);
        try {
            const res = await authedFetch('/api/admin/prospects', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    contactName: form.contactName || null,
                    phone: form.phone || null,
                    email: form.email || null,
                    city: form.city || null,
                    notes: form.notes || null,
                    nextActionDate: form.nextActionDate || null,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Création impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            toast({ title: 'Prospect ajouté' });
            setForm(EMPTY_FORM);
            setAddOpen(false);
            await load();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setSaving(false);
        }
    };

    const changeStage = async (prospect: Prospect, stage: Stage) => {
        if (prospect.stage === stage || updatingId) return;
        setUpdatingId(prospect.id);
        try {
            const res = await authedFetch(`/api/admin/prospects/${prospect.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ stage }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Mise à jour impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            setProspects(prev => prev?.map(p => (p.id === prospect.id ? { ...p, stage } : p)) ?? null);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setUpdatingId(null);
        }
    };

    const deleteProspect = async () => {
        if (!deleteTarget) return;
        try {
            const res = await authedFetch(`/api/admin/prospects/${deleteTarget.id}`, { method: 'DELETE' });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Suppression impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            toast({ title: 'Prospect supprimé' });
            setProspects(prev => prev?.filter(p => p.id !== deleteTarget.id) ?? null);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setDeleteTarget(null);
        }
    };

    const counts = useMemo(() => {
        const acc: Record<Stage, number> = { contacte: 0, demo: 0, essai: 0, converti: 0, perdu: 0 };
        (prospects ?? []).forEach(p => { acc[p.stage] += 1; });
        return acc;
    }, [prospects]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return (prospects ?? []).filter(p => {
            if (activeFilter !== 'all' && p.stage !== activeFilter) return false;
            if (!term) return true;
            return p.schoolName.toLowerCase().includes(term)
                || (p.contactName ?? '').toLowerCase().includes(term)
                || (p.city ?? '').toLowerCase().includes(term);
        });
    }, [prospects, search, activeFilter]);

    if (prospects === null) {
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
                    <h1 className="text-3xl font-black tracking-tight">Prospects</h1>
                    <p className="text-sm text-muted-foreground">
                        Pipeline de prospection : suivez chaque école démarchée de la prise de contact à la conversion.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-1.5">Actualiser</span>
                    </Button>
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4" />
                                <span className="ml-1.5">Nouveau prospect</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Nouveau prospect</DialogTitle>
                                <DialogDescription>
                                    École démarchée mais pas encore inscrite sur la plateforme.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <Input
                                    value={form.schoolName}
                                    onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))}
                                    placeholder="Nom de l'école *"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        value={form.contactName}
                                        onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                                        placeholder="Contact (directeur…)"
                                    />
                                    <Input
                                        value={form.city}
                                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                        placeholder="Ville"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        value={form.phone}
                                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="Téléphone"
                                    />
                                    <Input
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        placeholder="Email"
                                        type="email"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as Stage }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Étape" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(Object.keys(STAGE_META) as Stage[]).map(s => (
                                                <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="date"
                                        value={form.nextActionDate}
                                        onChange={e => setForm(f => ({ ...f, nextActionDate: e.target.value }))}
                                        title="Prochaine action"
                                    />
                                </div>
                                <Textarea
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Notes : contexte, besoins exprimés, objections…"
                                    rows={3}
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={createProspect} disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Ajouter
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
                {(Object.keys(STAGE_META) as Stage[]).map(s => (
                    <button
                        key={s}
                        onClick={() => setActiveFilter(activeFilter === s ? 'all' : s)}
                        className={cn(
                            'text-left transition-all rounded-2xl',
                            activeFilter === s && 'ring-2 ring-primary ring-offset-2',
                        )}
                    >
                        <StatCard stage={s} count={counts[s]} />
                    </button>
                ))}
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Pipeline</CardTitle>
                        <CardDescription>
                            {filtered.length} prospect{filtered.length > 1 ? 's' : ''}
                            {activeFilter !== 'all' ? ` — filtre : ${STAGE_META[activeFilter].label}` : ''}
                        </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher…"
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
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Ville</TableHead>
                                    <TableHead>Étape</TableHead>
                                    <TableHead>Prochaine action</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Aucun prospect dans cette catégorie. Ajoutez votre première école démarchée !
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-semibold">{p.schoolName}</TableCell>
                                            <TableCell className="text-sm">{p.contactName ?? '—'}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{p.city ?? '—'}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={p.stage}
                                                    onValueChange={v => changeStage(p, v as Stage)}
                                                    disabled={updatingId === p.id}
                                                >
                                                    <SelectTrigger className={cn('h-8 w-36 border font-semibold', STAGE_META[p.stage].tone)}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(Object.keys(STAGE_META) as Stage[]).map(s => (
                                                            <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                {p.nextActionDate ? (
                                                    <span className={cn(
                                                        'inline-flex items-center gap-1.5 text-xs font-semibold',
                                                        new Date(p.nextActionDate) < new Date() ? 'text-red-600' : 'text-amber-700',
                                                    )}>
                                                        <CalendarClock className="h-3.5 w-3.5" />
                                                        {format(new Date(p.nextActionDate), 'd MMM yyyy', { locale: fr })}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[220px]">
                                                <p className="truncate text-xs text-muted-foreground" title={p.notes ?? ''}>
                                                    {p.notes ?? '—'}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {p.email && (
                                                        <Button asChild size="icon" variant="ghost" className="h-8 w-8" title={`Écrire à ${p.email}`}>
                                                            <a href={`mailto:${p.email}`}>
                                                                <Mail className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {p.phone && (
                                                        <Button asChild size="icon" variant="ghost" className="h-8 w-8" title={`Appeler ${p.phone}`}>
                                                            <a href={`tel:${p.phone}`}>
                                                                <Phone className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600"
                                                        title="Supprimer"
                                                        onClick={() => setDeleteTarget(p)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
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

            <AlertDialog open={deleteTarget !== null} onOpenChange={isOpen => { if (!isOpen) setDeleteTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            « {deleteTarget?.schoolName} » sera définitivement supprimé du pipeline. Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteProspect} className="bg-red-600 hover:bg-red-700">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
