'use client';

import { useMemo, useState } from 'react';
import {
    collection, doc, orderBy, query, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Building2, Calendar, CheckCircle2, Clock, Filter,
    Mail, Phone, TrendingUp, User, Users, XCircle,
    ChevronDown, MessageSquare, Loader2, Inbox,
} from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type LeadStatus = 'new' | 'contacted' | 'demo_done' | 'converted' | 'lost';

interface Lead {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    schoolName: string;
    schoolType?: string;
    studentCount?: string;
    needs?: string[];
    message?: string;
    meetingDate?: string;
    meetingTime?: string;
    newsletter?: boolean;
    status?: LeadStatus;
    note?: string;
    submittedAt?: any;
    updatedAt?: any;
}

const STATUS_META: Record<LeadStatus, { label: string; tone: string; icon: typeof Clock }> = {
    new: { label: 'Nouveau', tone: 'bg-sky-50 text-sky-700 border-sky-200', icon: Inbox },
    contacted: { label: 'Contacté', tone: 'bg-amber-50 text-amber-700 border-amber-200', icon: Phone },
    demo_done: { label: 'Démo faite', tone: 'bg-purple-50 text-purple-700 border-purple-200', icon: Calendar },
    converted: { label: 'Converti', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    lost: { label: 'Perdu', tone: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

const PIPELINE: LeadStatus[] = ['new', 'contacted', 'demo_done', 'converted', 'lost'];

const SCHOOL_TYPE_LABELS: Record<string, string> = {
    primary: 'Primaire', middle: 'Collège', high: 'Lycée',
    international: 'International', group: 'Groupe scolaire',
};

export default function AdminLeadsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [note, setNote] = useState('');
    const [newStatus, setNewStatus] = useState<LeadStatus>('new');
    const [saving, setSaving] = useState(false);

    const leadsQuery = useMemo(
        () => user?.profile?.isAdmin
            ? query(collection(firestore, 'contact_requests'), orderBy('submittedAt', 'desc'))
            : null,
        [firestore, user?.profile?.isAdmin],
    );
    const { data, loading } = useCollection(leadsQuery);

    const leads: Lead[] = useMemo(
        () => data?.map(d => ({ id: d.id, status: 'new', ...(d.data() as Omit<Lead, 'id'>) })) ?? [],
        [data],
    );

    const filtered = useMemo(
        () => filterStatus === 'all' ? leads : leads.filter(l => (l.status ?? 'new') === filterStatus),
        [leads, filterStatus],
    );

    const stats = useMemo(() => {
        const counts: Record<LeadStatus, number> = { new: 0, contacted: 0, demo_done: 0, converted: 0, lost: 0 };
        leads.forEach(l => { counts[(l.status ?? 'new')]++; });
        const conversionRate = leads.length > 0
            ? Math.round((counts.converted / leads.length) * 100)
            : 0;
        return { counts, total: leads.length, conversionRate };
    }, [leads]);

    const openLead = (lead: Lead) => {
        setSelectedLead(lead);
        setNewStatus(lead.status ?? 'new');
        setNote(lead.note ?? '');
    };

    const handleSave = async () => {
        if (!selectedLead) return;
        setSaving(true);
        try {
            await updateDoc(doc(firestore, 'contact_requests', selectedLead.id), {
                status: newStatus,
                note: note.trim(),
                updatedAt: serverTimestamp(),
                updatedBy: user?.uid ?? '',
            });
            toast({ title: 'Lead mis à jour' });
            setSelectedLead(null);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: err?.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Leads & Prospects</h1>
                    <p className="text-sm text-muted-foreground">
                        Demandes de démonstration reçues via le formulaire de contact.
                    </p>
                </div>
            </div>

            {/* Stats Pipeline */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {PIPELINE.map(status => {
                    const meta = STATUS_META[status];
                    const Icon = meta.icon;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(prev => prev === status ? 'all' : status)}
                            className={cn(
                                'text-left rounded-xl border p-4 transition-all hover:shadow-md',
                                filterStatus === status ? 'ring-2 ring-primary shadow-md' : 'bg-white/60',
                            )}
                        >
                            <div className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg border mb-2', meta.tone)}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-2xl font-black">{stats.counts[status]}</div>
                            <div className="text-xs text-muted-foreground font-medium">{meta.label}</div>
                        </button>
                    );
                })}
            </div>

            {/* Conversion rate */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 pb-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-primary">{stats.conversionRate}%</div>
                        <div className="text-xs text-muted-foreground">
                            Taux de conversion · {stats.counts.converted} converti(s) sur {stats.total} lead(s)
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filter */}
            <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={v => setFilterStatus(v as LeadStatus | 'all')}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les statuts ({stats.total})</SelectItem>
                        {PIPELINE.map(s => (
                            <SelectItem key={s} value={s}>
                                {STATUS_META[s].label} ({stats.counts[s]})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Leads list */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        {filterStatus === 'all'
                            ? 'Aucune demande de démo reçue pour l\'instant.'
                            : `Aucun lead avec le statut "${STATUS_META[filterStatus as LeadStatus]?.label}".`}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map(lead => {
                        const status = lead.status ?? 'new';
                        const meta = STATUS_META[status];
                        const Icon = meta.icon;
                        return (
                            <Card
                                key={lead.id}
                                className="hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => openLead(lead)}
                            >
                                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={cn('mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', meta.tone)}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-base flex items-center gap-2 flex-wrap">
                                                <span>{lead.firstName} {lead.lastName}</span>
                                                <Badge variant="outline" className={cn('border text-xs', meta.tone)}>
                                                    {meta.label}
                                                </Badge>
                                                {lead.newsletter && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Newsletter
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Building2 className="h-3 w-3" />
                                                    {lead.schoolName}
                                                    {lead.schoolType && ` · ${SCHOOL_TYPE_LABELS[lead.schoolType] ?? lead.schoolType}`}
                                                    {lead.studentCount && ` · ${lead.studentCount} élèves`}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    {lead.email}
                                                </span>
                                                {lead.phone && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Phone className="h-3 w-3" />
                                                        {lead.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right space-y-1">
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                            <Clock className="h-3 w-3" />
                                            {lead.submittedAt?.seconds
                                                ? formatDistanceToNow(lead.submittedAt.seconds * 1000, { addSuffix: true, locale: fr })
                                                : '—'}
                                        </div>
                                        {lead.meetingDate && (
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                                <Calendar className="h-3 w-3" />
                                                {lead.meetingDate} {lead.meetingTime}
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-3 pt-0">
                                    <div className="flex flex-wrap gap-2 ml-12">
                                        {lead.needs?.map(n => (
                                            <Badge key={n} variant="secondary" className="text-xs font-normal">{n}</Badge>
                                        ))}
                                    </div>
                                    {lead.note && (
                                        <div className="ml-12 mt-2 text-xs text-muted-foreground flex items-start gap-1">
                                            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                                            <span className="line-clamp-1">{lead.note}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Detail / Edit Dialog */}
            <Dialog open={!!selectedLead} onOpenChange={open => !open && setSelectedLead(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedLead?.firstName} {selectedLead?.lastName}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedLead && (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                            {/* Contact info */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="space-y-1">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Établissement</div>
                                    <div className="font-medium">{selectedLead.schoolName}</div>
                                    {selectedLead.schoolType && <div className="text-muted-foreground">{SCHOOL_TYPE_LABELS[selectedLead.schoolType] ?? selectedLead.schoolType}</div>}
                                    {selectedLead.studentCount && <div className="text-muted-foreground">{selectedLead.studentCount} élèves</div>}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</div>
                                    <div className="font-medium">{selectedLead.email}</div>
                                    {selectedLead.phone && <div className="text-muted-foreground">{selectedLead.phone}</div>}
                                </div>
                            </div>

                            {selectedLead.meetingDate && (
                                <div className="text-sm bg-muted/40 rounded-lg p-3 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span>RDV souhaité le <strong>{selectedLead.meetingDate}</strong> à <strong>{selectedLead.meetingTime}</strong></span>
                                </div>
                            )}

                            {selectedLead.needs && selectedLead.needs.length > 0 && (
                                <div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Besoins identifiés</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedLead.needs.map(n => (
                                            <Badge key={n} variant="secondary">{n}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedLead.message && (
                                <div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Message</div>
                                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">{selectedLead.message}</p>
                                </div>
                            )}

                            <div className="border-t pt-4 space-y-3">
                                <div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Statut pipeline</div>
                                    <Select value={newStatus} onValueChange={v => setNewStatus(v as LeadStatus)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PIPELINE.map(s => (
                                                <SelectItem key={s} value={s}>
                                                    {STATUS_META[s].label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Note interne</div>
                                    <Textarea
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                        placeholder="Observations, compte-rendu de démo, prochaines étapes…"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedLead(null)}>Fermer</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
