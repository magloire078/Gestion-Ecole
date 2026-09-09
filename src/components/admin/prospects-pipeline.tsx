'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isBefore, startOfDay, parseISO } from 'date-fns';
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
    LayoutGrid, TableProperties, Download, FileText, MessageCircle, Clock, MapPin, Building2, User, ChevronRight, Sparkles, Filter, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type Stage = 'contacte' | 'demo' | 'essai' | 'converti' | 'perdu';

export interface Prospect {
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

export const STAGE_META: Record<Stage, { label: string; tone: string; badgeTone: string; borderTone: string; icon: typeof PhoneCall }> = {
    contacte: {
        label: 'Contactés',
        tone: 'bg-sky-50/80 text-sky-800 border-sky-200',
        badgeTone: 'bg-sky-100 text-sky-800 border-sky-200',
        borderTone: 'border-l-sky-500',
        icon: PhoneCall
    },
    demo: {
        label: 'Démo planifiée',
        tone: 'bg-purple-50/80 text-purple-800 border-purple-200',
        badgeTone: 'bg-purple-100 text-purple-800 border-purple-200',
        borderTone: 'border-l-purple-500',
        icon: Presentation
    },
    essai: {
        label: 'En essai',
        tone: 'bg-amber-50/80 text-amber-800 border-amber-200',
        badgeTone: 'bg-amber-100 text-amber-800 border-amber-200',
        borderTone: 'border-l-amber-500',
        icon: TrendingUp
    },
    converti: {
        label: 'Convertis (Gagné)',
        tone: 'bg-emerald-50/80 text-emerald-800 border-emerald-200',
        badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        borderTone: 'border-l-emerald-500',
        icon: Handshake
    },
    perdu: {
        label: 'Perdus',
        tone: 'bg-rose-50/80 text-rose-800 border-rose-200',
        badgeTone: 'bg-rose-100 text-rose-800 border-rose-200',
        borderTone: 'border-l-rose-500',
        icon: XCircle
    },
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

export function ProspectsPipeline() {
    const auth = useAuth();
    const { user } = useUser();
    const { toast } = useToast();
    const [prospects, setProspects] = useState<Prospect[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<Stage | 'all'>('all');
    const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'due' | 'with_date'>('all');
    
    // Add Dialog State
    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // Detail & Interaction Modal State
    const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
    const [detailForm, setDetailForm] = useState<Partial<Prospect>>({});
    const [quickInteractionType, setQuickInteractionType] = useState<string>('Appel');
    const [quickInteractionNote, setQuickInteractionNote] = useState<string>('');
    const [isSavingDetail, setIsSavingDetail] = useState(false);

    // Update & Delete States
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

    const canAccess = !!(user?.profile?.isAdmin || user?.profile?.isCommercial);
    useEffect(() => {
        if (canAccess && prospects === null && !loading) {
            load();
        }
    }, [canAccess, prospects, loading, load]);

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
            toast({ title: 'Prospect ajouté avec succès' });
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
            if (selectedProspect?.id === prospect.id) {
                setSelectedProspect(prev => prev ? { ...prev, stage } : null);
            }
            toast({ title: `Déplacé vers ${STAGE_META[stage].label}` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setUpdatingId(null);
        }
    };

    const openProspectDetail = (p: Prospect) => {
        setSelectedProspect(p);
        setDetailForm({
            schoolName: p.schoolName,
            contactName: p.contactName,
            phone: p.phone,
            email: p.email,
            city: p.city,
            stage: p.stage,
            nextActionDate: p.nextActionDate,
            notes: p.notes,
        });
        setQuickInteractionNote('');
    };

    const saveProspectDetail = async () => {
        if (!selectedProspect) return;
        setIsSavingDetail(true);
        try {
            let finalNotes = detailForm.notes || '';
            if (quickInteractionNote.trim()) {
                const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr });
                const author = user?.profile?.displayName || 'Commercial';
                const interactionLog = `\n\n📝 [${timestamp} - ${quickInteractionType} (${author})] : ${quickInteractionNote.trim()}`;
                finalNotes = (finalNotes + interactionLog).trim();
            }

            const payload = {
                schoolName: detailForm.schoolName,
                contactName: detailForm.contactName || null,
                phone: detailForm.phone || null,
                email: detailForm.email || null,
                city: detailForm.city || null,
                stage: detailForm.stage,
                nextActionDate: detailForm.nextActionDate || null,
                notes: finalNotes || null,
            };

            const res = await authedFetch(`/api/admin/prospects/${selectedProspect.id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Enregistrement impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }

            const updated: Prospect = {
                ...selectedProspect,
                ...payload,
                updatedAt: new Date().toISOString(),
            };

            setProspects(prev => prev?.map(p => (p.id === updated.id ? updated : p)) ?? null);
            setSelectedProspect(updated);
            setQuickInteractionNote('');
            toast({ title: 'Fiche prospect mise à jour' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setIsSavingDetail(false);
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
            if (selectedProspect?.id === deleteTarget.id) {
                setSelectedProspect(null);
            }
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

    const dueCount = useMemo(() => {
        const today = startOfDay(new Date());
        return (prospects ?? []).filter(p => {
            if (!p.nextActionDate || p.stage === 'converti' || p.stage === 'perdu') return false;
            try {
                const d = parseISO(p.nextActionDate);
                return isBefore(d, today) || isToday(d);
            } catch {
                return false;
            }
        }).length;
    }, [prospects]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        const today = startOfDay(new Date());

        return (prospects ?? []).filter(p => {
            if (activeFilter !== 'all' && p.stage !== activeFilter) return false;

            if (urgencyFilter === 'due') {
                if (!p.nextActionDate) return false;
                try {
                    const d = parseISO(p.nextActionDate);
                    if (!isBefore(d, today) && !isToday(d)) return false;
                } catch {
                    return false;
                }
            } else if (urgencyFilter === 'with_date' && !p.nextActionDate) {
                return false;
            }

            if (!term) return true;
            return (
                p.schoolName.toLowerCase().includes(term) ||
                (p.contactName ?? '').toLowerCase().includes(term) ||
                (p.city ?? '').toLowerCase().includes(term) ||
                (p.phone ?? '').toLowerCase().includes(term) ||
                (p.notes ?? '').toLowerCase().includes(term)
            );
        });
    }, [prospects, search, activeFilter, urgencyFilter]);

    // CSV Export
    const exportCsv = () => {
        if (!prospects || prospects.length === 0) {
            toast({ title: 'Aucun prospect à exporter' });
            return;
        }

        const headers = ['Nom Ecole', 'Contact', 'Telephone', 'Email', 'Ville', 'Etape', 'Prochaine Relance', 'Notes', 'Cree le'];
        const rows = prospects.map(p => [
            `"${(p.schoolName || '').replace(/"/g, '""')}"`,
            `"${(p.contactName || '').replace(/"/g, '""')}"`,
            `"${(p.phone || '').replace(/"/g, '""')}"`,
            `"${(p.email || '').replace(/"/g, '""')}"`,
            `"${(p.city || '').replace(/"/g, '""')}"`,
            `"${STAGE_META[p.stage]?.label || p.stage}"`,
            `"${p.nextActionDate || ''}"`,
            `"${(p.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            `"${p.createdAt ? format(new Date(p.createdAt), 'yyyy-MM-dd') : ''}"`,
        ]);

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pipeline_prospects_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Export CSV téléchargé' });
    };

    if (prospects === null) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Prospects & CRM</h1>
                        <Badge className="bg-blue-600 text-white font-mono px-2.5 py-0.5 rounded-full text-xs">
                            {prospects.length} écoles
                        </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Pipeline commercial complet : suivez le cycle de vente de la prise de contact à la souscription.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* View Switcher */}
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('kanban')}
                            className={cn(
                                'h-8 px-3 rounded-lg text-xs font-bold transition-all',
                                viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            )}
                        >
                            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                            Kanban
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                'h-8 px-3 rounded-lg text-xs font-bold transition-all',
                                viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            )}
                        >
                            <TableProperties className="h-3.5 w-3.5 mr-1.5" />
                            Tableau
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" onClick={exportCsv} className="rounded-xl border-slate-200">
                        <Download className="h-4 w-4 mr-1.5 text-slate-600" />
                        <span>Export CSV</span>
                    </Button>

                    <Button variant="outline" size="sm" onClick={load} disabled={loading} className="rounded-xl border-slate-200">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5 text-slate-600" />}
                        <span>Actualiser</span>
                    </Button>

                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md">
                                <Plus className="h-4 w-4 mr-1.5" />
                                <span>Nouveau prospect</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-slate-900">Ajouter un nouveau prospect</DialogTitle>
                                <DialogDescription>
                                    Enregistrez une nouvelle école démarchée dans le CRM.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3.5 py-2">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nom de l'établissement *</label>
                                    <Input
                                        value={form.schoolName}
                                        onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))}
                                        placeholder="Ex: Groupe Scolaire Les Oliviers"
                                        className="rounded-xl mt-1"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nom du contact</label>
                                        <Input
                                            value={form.contactName}
                                            onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                                            placeholder="Directeur, Fondateur..."
                                            className="rounded-xl mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Ville / Commune</label>
                                        <Input
                                            value={form.city}
                                            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                                            placeholder="Ex: Abidjan, Cocody"
                                            className="rounded-xl mt-1"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Téléphone</label>
                                        <Input
                                            value={form.phone}
                                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                            placeholder="+225 07 00 00 00"
                                            className="rounded-xl mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Email</label>
                                        <Input
                                            value={form.email}
                                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            placeholder="direction@ecole.ci"
                                            type="email"
                                            className="rounded-xl mt-1"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Étape initiale</label>
                                        <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as Stage }))}>
                                            <SelectTrigger className="rounded-xl mt-1">
                                                <SelectValue placeholder="Étape" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {(Object.keys(STAGE_META) as Stage[]).map(s => (
                                                    <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Prochaine relance</label>
                                        <Input
                                            type="date"
                                            value={form.nextActionDate}
                                            onChange={e => setForm(f => ({ ...f, nextActionDate: e.target.value }))}
                                            className="rounded-xl mt-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Notes & Contexte initial</label>
                                    <Textarea
                                        value={form.notes}
                                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Taille estimée de l'école, logiciels actuels, besoins exprimés..."
                                        rows={3}
                                        className="rounded-xl mt-1"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">
                                    Annuler
                                </Button>
                                <Button onClick={createProspect} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Créer le prospect
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {(Object.keys(STAGE_META) as Stage[]).map(s => {
                    const meta = STAGE_META[s];
                    const Icon = meta.icon;
                    const isSelected = activeFilter === s;
                    return (
                        <button
                            key={s}
                            onClick={() => setActiveFilter(activeFilter === s ? 'all' : s)}
                            className={cn(
                                'text-left rounded-2xl border p-3.5 transition-all bg-white/60 backdrop-blur-md shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                                meta.tone,
                                isSelected && 'ring-2 ring-blue-600 ring-offset-2 shadow-md'
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider">{meta.label}</span>
                                <Icon className="h-4 w-4 opacity-70" />
                            </div>
                            <p className="mt-1 text-2xl font-black tabular-nums">{counts[s]}</p>
                        </button>
                    );
                })}

                {/* Due Reminders Card */}
                <button
                    onClick={() => setUrgencyFilter(urgencyFilter === 'due' ? 'all' : 'due')}
                    className={cn(
                        'text-left rounded-2xl border p-3.5 transition-all bg-white/60 backdrop-blur-md shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                        dueCount > 0 ? 'bg-red-50/80 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200',
                        urgencyFilter === 'due' && 'ring-2 ring-rose-600 ring-offset-2 shadow-md'
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider">À Relancer</span>
                        <AlertCircle className={cn('h-4 w-4', dueCount > 0 ? 'text-rose-600' : 'opacity-40')} />
                    </div>
                    <p className="mt-1 text-2xl font-black tabular-nums">{dueCount}</p>
                </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white/40 backdrop-blur-xl border border-white/60 p-3 rounded-2xl shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher par école, contact, ville, téléphone..."
                        className="pl-9 rounded-xl border-slate-200 bg-white/80"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {(activeFilter !== 'all' || urgencyFilter !== 'all' || search) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setActiveFilter('all');
                                setUrgencyFilter('all');
                                setSearch('');
                            }}
                            className="h-8 text-xs font-semibold text-slate-500 hover:text-slate-900"
                        >
                            Réinitialiser les filtres
                        </Button>
                    )}

                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                        <a
                            href="/admin/forms/fiche-inscription-prospect-imprimable.docx"
                            download
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-semibold px-2 py-1 rounded-lg hover:bg-white transition-colors"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Fiche Imprimable</span>
                        </a>
                        <a
                            href="/admin/forms/fiche-inscription-prospect-interactive.docx"
                            download
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-semibold px-2 py-1 rounded-lg hover:bg-white transition-colors"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Fiche Interactive</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {viewMode === 'kanban' ? (
                /* KANBAN VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
                    {(Object.keys(STAGE_META) as Stage[]).map(stageKey => {
                        const meta = STAGE_META[stageKey];
                        const Icon = meta.icon;
                        const columnProspects = filtered.filter(p => p.stage === stageKey);

                        return (
                            <div
                                key={stageKey}
                                className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 min-h-[450px]"
                            >
                                {/* Column Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={cn('p-1.5 rounded-lg', meta.badgeTone)}>
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                            {meta.label}
                                        </span>
                                    </div>
                                    <Badge variant="secondary" className="font-mono text-xs rounded-full px-2">
                                        {columnProspects.length}
                                    </Badge>
                                </div>

                                {/* Column Cards */}
                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                                    {columnProspects.length === 0 ? (
                                        <div className="text-center py-8 text-xs text-slate-400 font-medium">
                                            Aucun prospect
                                        </div>
                                    ) : (
                                        columnProspects.map(p => {
                                            const hasDue = p.nextActionDate && (isBefore(parseISO(p.nextActionDate), startOfDay(new Date())) || isToday(parseISO(p.nextActionDate)));

                                            return (
                                                <motion.div
                                                    key={p.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.96 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.96 }}
                                                    className={cn(
                                                        'group rounded-xl border bg-white p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4',
                                                        meta.borderTone,
                                                        hasDue && 'ring-1 ring-rose-400'
                                                    )}
                                                    onClick={() => openProspectDetail(p)}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
                                                            {p.schoolName}
                                                        </h3>
                                                    </div>

                                                    {(p.contactName || p.city) && (
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                            {p.contactName && (
                                                                <span className="inline-flex items-center gap-1 font-medium">
                                                                    <User className="h-3 w-3 text-slate-400" />
                                                                    {p.contactName}
                                                                </span>
                                                            )}
                                                            {p.city && (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <MapPin className="h-3 w-3 text-slate-400" />
                                                                    {p.city}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {p.notes && (
                                                        <p className="mt-2 text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                            {p.notes.split('\n')[0]}
                                                        </p>
                                                    )}

                                                    {/* Next Action Date indicator */}
                                                    {p.nextActionDate && (
                                                        <div className="mt-2.5 flex items-center justify-between text-[11px]">
                                                            <span
                                                                className={cn(
                                                                    'inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md',
                                                                    hasDue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                                                                )}
                                                            >
                                                                <CalendarClock className="h-3 w-3" />
                                                                {hasDue && '⚠️ '}
                                                                {format(parseISO(p.nextActionDate), 'd MMM yyyy', { locale: fr })}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Action buttons on card */}
                                                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1">
                                                            {p.phone && (
                                                                <>
                                                                    <Button asChild size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="WhatsApp">
                                                                        <a href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                                                                            <MessageCircle className="h-3.5 w-3.5" />
                                                                        </a>
                                                                    </Button>
                                                                    <Button asChild size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Appeler">
                                                                        <a href={`tel:${p.phone}`}>
                                                                            <Phone className="h-3.5 w-3.5" />
                                                                        </a>
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {p.email && (
                                                                <Button asChild size="icon" variant="ghost" className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100" title="Email">
                                                                    <a href={`mailto:${p.email}`}>
                                                                        <Mail className="h-3.5 w-3.5" />
                                                                    </a>
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {/* Stage Changer Dropdown */}
                                                        <Select
                                                            value={p.stage}
                                                            onValueChange={v => changeStage(p, v as Stage)}
                                                            disabled={updatingId === p.id}
                                                        >
                                                            <SelectTrigger className="h-7 text-[11px] w-28 rounded-lg border-slate-200">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl">
                                                                {(Object.keys(STAGE_META) as Stage[]).map(s => (
                                                                    <SelectItem key={s} value={s} className="text-xs">
                                                                        {STAGE_META[s].label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* TABLE VIEW */
                <Card className="rounded-2xl border-white/60 bg-white/40 backdrop-blur-xl shadow-xl overflow-hidden">
                    <CardHeader className="p-4 border-b border-slate-100">
                        <CardTitle className="text-base font-black text-slate-900">Liste détaillée des prospects</CardTitle>
                        <CardDescription>
                            {filtered.length} prospect{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow>
                                        <TableHead className="font-bold">École</TableHead>
                                        <TableHead className="font-bold">Contact</TableHead>
                                        <TableHead className="font-bold">Ville</TableHead>
                                        <TableHead className="font-bold">Étape</TableHead>
                                        <TableHead className="font-bold">Prochaine relance</TableHead>
                                        <TableHead className="font-bold">Notes</TableHead>
                                        <TableHead className="font-bold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                                                Aucun prospect ne correspond à vos filtres.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map(p => (
                                            <TableRow key={p.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => openProspectDetail(p)}>
                                                <TableCell className="font-bold text-slate-900">{p.schoolName}</TableCell>
                                                <TableCell className="text-sm text-slate-600">{p.contactName ?? '—'}</TableCell>
                                                <TableCell className="text-sm text-slate-500">{p.city ?? '—'}</TableCell>
                                                <TableCell onClick={e => e.stopPropagation()}>
                                                    <Select
                                                        value={p.stage}
                                                        onValueChange={v => changeStage(p, v as Stage)}
                                                        disabled={updatingId === p.id}
                                                    >
                                                        <SelectTrigger className={cn('h-8 w-36 border rounded-lg font-semibold text-xs', STAGE_META[p.stage].badgeTone)}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            {(Object.keys(STAGE_META) as Stage[]).map(s => (
                                                                <SelectItem key={s} value={s} className="text-xs">{STAGE_META[s].label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    {p.nextActionDate ? (
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md',
                                                            isBefore(parseISO(p.nextActionDate), startOfDay(new Date())) ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                                                        )}>
                                                            <CalendarClock className="h-3.5 w-3.5" />
                                                            {format(parseISO(p.nextActionDate), 'd MMM yyyy', { locale: fr })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-[220px]">
                                                    <p className="truncate text-xs text-slate-500" title={p.notes ?? ''}>
                                                        {p.notes ?? '—'}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-1">
                                                        {p.phone && (
                                                            <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" title="WhatsApp">
                                                                <a href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                                                                    <MessageCircle className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
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
            )}

            {/* DETAIL & INTERACTION MODAL */}
            <Dialog open={selectedProspect !== null} onOpenChange={isOpen => { if (!isOpen) setSelectedProspect(null); }}>
                <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-6">
                            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                {detailForm.schoolName}
                            </DialogTitle>
                            {detailForm.stage && (
                                <Badge className={cn('font-bold', STAGE_META[detailForm.stage as Stage]?.badgeTone)}>
                                    {STAGE_META[detailForm.stage as Stage]?.label}
                                </Badge>
                            )}
                        </div>
                        <DialogDescription>
                            Fiche détaillée, historique des interactions et plan d'action commercial.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Coordonnées */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Coordonnées de l'établissement</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-600">Nom de l'école</label>
                                    <Input
                                        value={detailForm.schoolName ?? ''}
                                        onChange={e => setDetailForm(d => ({ ...d, schoolName: e.target.value }))}
                                        className="rounded-xl mt-1 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600">Contact (Directeur / Délégué)</label>
                                    <Input
                                        value={detailForm.contactName ?? ''}
                                        onChange={e => setDetailForm(d => ({ ...d, contactName: e.target.value }))}
                                        className="rounded-xl mt-1 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600">Téléphone</label>
                                    <Input
                                        value={detailForm.phone ?? ''}
                                        onChange={e => setDetailForm(d => ({ ...d, phone: e.target.value }))}
                                        className="rounded-xl mt-1 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600">Email</label>
                                    <Input
                                        value={detailForm.email ?? ''}
                                        onChange={e => setDetailForm(d => ({ ...d, email: e.target.value }))}
                                        className="rounded-xl mt-1 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600">Ville / Commune</label>
                                    <Input
                                        value={detailForm.city ?? ''}
                                        onChange={e => setDetailForm(d => ({ ...d, city: e.target.value }))}
                                        className="rounded-xl mt-1 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600">Prochaine action / Relance</label>
                                    <Input
                                        type="date"
                                        value={detailForm.nextActionDate ?? ''}
                                        onChange={e => setDetailForm(d => ({ ...d, nextActionDate: e.target.value }))}
                                        className="rounded-xl mt-1 bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Consigner une interaction rapide */}
                        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
                            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                                <Sparkles className="h-4 w-4 text-blue-600" />
                                <span>Consigner un échange ou compte-rendu</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['Appel', 'WhatsApp', 'Démo / RDV', 'Visite terrain', 'Email'].map(t => (
                                    <Button
                                        key={t}
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setQuickInteractionType(t)}
                                        className={cn(
                                            'text-xs rounded-lg transition-all',
                                            quickInteractionType === t ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-white text-slate-700'
                                        )}
                                    >
                                        {t}
                                    </Button>
                                ))}
                            </div>
                            <Textarea
                                value={quickInteractionNote}
                                onChange={e => setQuickInteractionNote(e.target.value)}
                                placeholder={`Détail du ${quickInteractionType} : points abordés, retours, décision...`}
                                rows={2}
                                className="rounded-xl bg-white border-blue-200"
                            />
                        </div>

                        {/* Journal complet des notes */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Historique & Notes complètes
                            </label>
                            <Textarea
                                value={detailForm.notes ?? ''}
                                onChange={e => setDetailForm(d => ({ ...d, notes: e.target.value }))}
                                placeholder="Historique général..."
                                rows={6}
                                className="rounded-xl font-sans text-xs bg-slate-50"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                            onClick={() => {
                                if (selectedProspect) {
                                    setDeleteTarget(selectedProspect);
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Supprimer
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setSelectedProspect(null)} className="rounded-xl">
                                Fermer
                            </Button>
                            <Button onClick={saveProspectDetail} disabled={isSavingDetail} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                                {isSavingDetail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enregistrer les modifications
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION DIALOG */}
            <AlertDialog open={deleteTarget !== null} onOpenChange={isOpen => { if (!isOpen) setDeleteTarget(null); }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            « {deleteTarget?.schoolName} » sera définitivement supprimé du pipeline CRM.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteProspect} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
