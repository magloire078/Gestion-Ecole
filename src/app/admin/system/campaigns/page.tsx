'use client';

import { useMemo, useState } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    BarChart3, CheckCircle2, Clock, Loader2, Mail, MessageCircle,
    Plus, Send, XCircle,
} from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
    AVAILABLE_PLACEHOLDERS,
    createCampaign,
    dispatchCampaign,
    type Campaign,
    type CampaignChannel,
    type CampaignStatus,
} from '@/services/campaign-service';
import type { AnnouncementTarget } from '@/services/announcement-service';
import { cn } from '@/lib/utils';

const STATUS_META: Record<CampaignStatus, { label: string; tone: string; icon: typeof Clock }> = {
    draft: { label: 'Brouillon', tone: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock },
    scheduled: { label: 'Programmée', tone: 'bg-sky-50 text-sky-700 border-sky-200', icon: Clock },
    sending: { label: 'En cours', tone: 'bg-amber-50 text-amber-700 border-amber-200', icon: Loader2 },
    sent: { label: 'Envoyée', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    failed: { label: 'Échec', tone: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

export default function AdminCampaignsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const [name, setName] = useState('');
    const [channel, setChannel] = useState<CampaignChannel>('email');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [targetType, setTargetType] = useState<AnnouncementTarget['type']>('all');
    const [targetValues, setTargetValues] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');

    const campaignsQuery = useMemo(
        () => (user?.profile?.isAdmin
            ? query(collection(firestore, 'campaigns'), orderBy('createdAt', 'desc'))
            : null),
        [firestore, user?.profile?.isAdmin],
    );
    const { data, loading } = useCollection(campaignsQuery);

    const campaigns: (Campaign & { id: string })[] = useMemo(
        () => data?.map(d => ({ id: d.id, ...(d.data() as Campaign) })) || [],
        [data],
    );

    const resetForm = () => {
        setName('');
        setChannel('email');
        setSubject('');
        setBody('');
        setTargetType('all');
        setTargetValues('');
        setScheduledAt('');
    };

    const handleCreate = async (mode: 'save' | 'send') => {
        if (!name.trim() || !body.trim()) {
            toast({ variant: 'destructive', title: 'Champs incomplets', description: 'Nom et corps obligatoires.' });
            return;
        }
        if (channel === 'email' && !subject.trim()) {
            toast({ variant: 'destructive', title: 'Sujet manquant', description: "Un email exige un sujet." });
            return;
        }

        let target: AnnouncementTarget;
        if (targetType === 'all') {
            target = { type: 'all' };
        } else {
            const values = targetValues.split(',').map(v => v.trim()).filter(Boolean);
            if (values.length === 0) {
                toast({ variant: 'destructive', title: 'Cible vide' });
                return;
            }
            target = { type: targetType, values: values as any };
        }

        setBusy(true);
        try {
            const id = await createCampaign(firestore, {
                name: name.trim(),
                channel,
                subject: channel === 'email' ? subject.trim() : undefined,
                body: body.trim(),
                target,
                scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                createdBy: user?.uid ?? '',
                createdByName: user?.displayName ?? 'Super-admin',
            });
            if (mode === 'send') {
                await dispatchCampaign(firestore, id);
                toast({ title: 'Campagne envoyée', description: 'Le traitement asynchrone démarre.' });
            } else {
                toast({ title: 'Brouillon enregistré' });
            }
            resetForm();
            setOpen(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: err?.message });
        } finally {
            setBusy(false);
        }
    };

    const handleDispatch = async (id: string) => {
        try {
            await dispatchCampaign(firestore, id);
            toast({ title: 'Envoi démarré' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: err?.message });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Campagnes</h1>
                    <p className="text-sm text-muted-foreground">
                        Diffusion email/WhatsApp ciblée vers les écoles abonnées.
                    </p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Nouvelle campagne
                </Button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
            ) : campaigns.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <Send className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        Aucune campagne. Créez la première pour communiquer en masse.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {campaigns.map(c => {
                        const meta = STATUS_META[c.status];
                        const Icon = meta.icon;
                        return (
                            <Card key={c.id}>
                                <CardHeader className="flex flex-row items-start justify-between gap-4">
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg border', meta.tone)}>
                                                <Icon className={cn('h-3.5 w-3.5', c.status === 'sending' && 'animate-spin')} />
                                            </span>
                                            {c.name}
                                            <Badge variant="outline" className="gap-1 capitalize">
                                                {c.channel === 'email' ? <Mail className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                                                {c.channel}
                                            </Badge>
                                            <Badge className={cn('border', meta.tone)} variant="outline">{meta.label}</Badge>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Créée {c.createdAt?.seconds ? formatDistanceToNow(c.createdAt.seconds * 1000, { addSuffix: true, locale: fr }) : '—'}
                                            {c.scheduledAt && ` · Programmée pour ${format(new Date(c.scheduledAt), 'd MMM yyyy HH:mm', { locale: fr })}`}
                                            {' '}· Cible : {c.target.type}{c.target.type !== 'all' ? ` (${(c.target as any).values?.length})` : ''}
                                        </CardDescription>
                                    </div>
                                    {c.status === 'draft' && (
                                        <Button size="sm" onClick={() => handleDispatch(c.id)}>
                                            <Send className="h-3.5 w-3.5 mr-1" /> Envoyer
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {c.subject && <p className="text-xs font-semibold text-muted-foreground">Sujet : {c.subject}</p>}
                                    <p className="text-sm whitespace-pre-wrap line-clamp-3 text-slate-700">{c.body}</p>
                                    {c.stats && (
                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t">
                                            <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Cibles : <strong>{c.stats.targetCount}</strong></span>
                                            <span>Mises en file : <strong>{c.stats.queued}</strong></span>
                                            {c.stats.failed > 0 && <span className="text-rose-600">Échecs : <strong>{c.stats.failed}</strong></span>}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Nouvelle campagne</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        <div>
                            <Label>Nom interne</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Relance abonnement expiré - juin" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Canal</Label>
                                <Select value={channel} onValueChange={v => setChannel(v as CampaignChannel)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Programmation (optionnel)</Label>
                                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                            </div>
                        </div>
                        {channel === 'email' && (
                            <div>
                                <Label>Sujet</Label>
                                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Votre abonnement {{plan}} arrive à échéance" />
                            </div>
                        )}
                        <div>
                            <Label>Corps du message</Label>
                            <Textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={8}
                                placeholder={`Bonjour {{directorName}},\n\nVotre plan {{plan}} pour {{schoolName}} expire le {{endDate}}…`}
                                className="font-mono text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Placeholders : {AVAILABLE_PLACEHOLDERS.map(p => `{{${p}}}`).join(', ')}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Cible</Label>
                                <Select value={targetType} onValueChange={v => setTargetType(v as AnnouncementTarget['type'])}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes les écoles</SelectItem>
                                        <SelectItem value="plan">Par plan</SelectItem>
                                        <SelectItem value="status">Par statut</SelectItem>
                                        <SelectItem value="school">Liste d'écoles</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {targetType !== 'all' && (
                                <div>
                                    <Label>Valeurs (virgules)</Label>
                                    <Input value={targetValues} onChange={e => setTargetValues(e.target.value)} />
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="flex flex-row gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
                        <Button variant="secondary" onClick={() => handleCreate('save')} disabled={busy}>Enregistrer brouillon</Button>
                        <Button onClick={() => handleCreate('send')} disabled={busy}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                            Envoyer maintenant
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
