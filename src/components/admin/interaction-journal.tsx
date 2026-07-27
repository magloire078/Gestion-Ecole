'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    CalendarClock, Loader2, Mail, MapPin, MessageCircle, Phone, StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type InteractionType = 'appel' | 'email' | 'whatsapp' | 'visite' | 'note';

interface InteractionEntry {
    id: string;
    type: InteractionType;
    note: string;
    nextActionDate: string | null;
    nextActionNote: string | null;
    createdBy: string;
    createdByEmail: string | null;
    createdAt: string | null;
}

const TYPE_META: Record<InteractionType, { label: string; tone: string; icon: typeof Phone }> = {
    appel: { label: 'Appel', tone: 'bg-sky-50 text-sky-700 border-sky-100', icon: Phone },
    email: { label: 'Email', tone: 'bg-violet-50 text-violet-700 border-violet-100', icon: Mail },
    whatsapp: { label: 'WhatsApp', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: MessageCircle },
    visite: { label: 'Visite', tone: 'bg-amber-50 text-amber-700 border-amber-100', icon: MapPin },
    note: { label: 'Note', tone: 'bg-slate-50 text-slate-600 border-slate-200', icon: StickyNote },
};

interface InteractionJournalSheetProps {
    schoolId: string | null;
    schoolName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InteractionJournalSheet({ schoolId, schoolName, open, onOpenChange }: InteractionJournalSheetProps) {
    const auth = useAuth();
    const { toast } = useToast();
    const [entries, setEntries] = useState<InteractionEntry[] | null>(null);
    const [saving, setSaving] = useState(false);

    const [type, setType] = useState<InteractionType>('appel');
    const [note, setNote] = useState('');
    const [nextActionDate, setNextActionDate] = useState('');
    const [nextActionNote, setNextActionNote] = useState('');

    const load = useCallback(async () => {
        const current = auth.currentUser;
        if (!current || !schoolId) return;
        setEntries(null);
        try {
            const token = await current.getIdToken();
            const res = await fetch(`/api/admin/crm/${schoolId}/interactions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Chargement impossible', description: body.error || `HTTP ${res.status}` });
                setEntries([]);
                return;
            }
            setEntries(body.entries ?? []);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
            setEntries([]);
        }
    }, [auth, schoolId, toast]);

    useEffect(() => {
        if (open && schoolId) {
            load();
        }
    }, [open, schoolId, load]);

    const submit = async () => {
        const current = auth.currentUser;
        if (!current || !schoolId || saving) return;
        if (!note.trim()) {
            toast({ variant: 'destructive', title: 'Note requise', description: 'Décrivez brièvement l\'échange.' });
            return;
        }
        setSaving(true);
        try {
            const token = await current.getIdToken();
            const res = await fetch(`/api/admin/crm/${schoolId}/interactions`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    note: note.trim(),
                    nextActionDate: nextActionDate || null,
                    nextActionNote: nextActionNote.trim() || null,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Enregistrement impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            toast({ title: 'Interaction enregistrée' });
            setNote('');
            setNextActionDate('');
            setNextActionNote('');
            await load();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Journal de suivi — {schoolName}</SheetTitle>
                    <SheetDescription>
                        Historique des contacts avec cette école et prochaine action prévue. Visible uniquement par les super-admins.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-3 rounded-2xl border bg-slate-50/50 p-4 dark:bg-white/5">
                    <p className="text-sm font-bold">Nouvelle interaction</p>
                    <div className="grid grid-cols-2 gap-3">
                        <Select value={type} onValueChange={v => setType(v as InteractionType)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(TYPE_META) as InteractionType[]).map(t => (
                                    <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            value={nextActionDate}
                            onChange={e => setNextActionDate(e.target.value)}
                            title="Date de la prochaine action (optionnel)"
                        />
                    </div>
                    <Textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Résumé de l'échange : qui, quoi, réaction du client…"
                        rows={3}
                    />
                    <Input
                        value={nextActionNote}
                        onChange={e => setNextActionNote(e.target.value)}
                        placeholder="Prochaine action (optionnel) : ex. rappeler le directeur"
                    />
                    <Button onClick={submit} disabled={saving} className="w-full">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer
                    </Button>
                </div>

                <div className="mt-6 space-y-3">
                    <p className="text-sm font-bold">
                        Historique{entries ? ` (${entries.length})` : ''}
                    </p>
                    {entries === null ? (
                        <div className="space-y-2">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : entries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Aucune interaction enregistrée pour cette école.
                        </p>
                    ) : (
                        entries.map(entry => {
                            const meta = TYPE_META[entry.type] ?? TYPE_META.note;
                            const Icon = meta.icon;
                            return (
                                <div key={entry.id} className="rounded-xl border p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge variant="outline" className={cn('font-semibold border', meta.tone)}>
                                            <Icon className="mr-1 h-3 w-3" />
                                            {meta.label}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {entry.createdAt
                                                ? format(new Date(entry.createdAt), 'd MMM yyyy à HH:mm', { locale: fr })
                                                : '—'}
                                        </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{entry.note}</p>
                                    {(entry.nextActionDate || entry.nextActionNote) && (
                                        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            {entry.nextActionDate
                                                ? format(new Date(entry.nextActionDate), 'd MMM yyyy', { locale: fr })
                                                : 'À planifier'}
                                            {entry.nextActionNote ? ` — ${entry.nextActionNote}` : ''}
                                        </p>
                                    )}
                                    {entry.createdByEmail && (
                                        <p className="text-[11px] text-muted-foreground">Par {entry.createdByEmail}</p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
