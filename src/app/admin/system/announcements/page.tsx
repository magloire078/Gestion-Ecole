'use client';

import { useMemo, useState } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Info, Megaphone, Plus, Trash2, XCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
    createAnnouncement,
    deleteAnnouncement,
    isAnnouncementActive,
    type AnnouncementSeverity,
    type AnnouncementTarget,
    type PlatformAnnouncement,
} from '@/services/announcement-service';
import { cn } from '@/lib/utils';

const SEVERITY_META: Record<AnnouncementSeverity, { label: string; tone: string; icon: typeof Info }> = {
    info: { label: 'Information', tone: 'bg-sky-50 text-sky-700 border-sky-200', icon: Info },
    warning: { label: 'Avertissement', tone: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
    critical: { label: 'Critique', tone: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

export default function AdminAnnouncementsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [severity, setSeverity] = useState<AnnouncementSeverity>('info');
    const [targetType, setTargetType] = useState<AnnouncementTarget['type']>('all');
    const [targetValues, setTargetValues] = useState('');
    const [publishAt, setPublishAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [expiresAt, setExpiresAt] = useState('');

    const announcementsQuery = useMemo(
        () => (user?.profile?.isAdmin
            ? query(collection(firestore, 'platform_announcements'), orderBy('publishAt', 'desc'))
            : null),
        [firestore, user?.profile?.isAdmin],
    );
    const { data, loading } = useCollection(announcementsQuery);

    const announcements: (PlatformAnnouncement & { id: string })[] = useMemo(
        () => data?.map(d => ({ id: d.id, ...(d.data() as PlatformAnnouncement) })) || [],
        [data],
    );

    const resetForm = () => {
        setTitle('');
        setContent('');
        setSeverity('info');
        setTargetType('all');
        setTargetValues('');
        setPublishAt(new Date().toISOString().slice(0, 16));
        setExpiresAt('');
    };

    const handleCreate = async () => {
        if (!title.trim() || !content.trim()) {
            toast({ variant: 'destructive', title: 'Titre et contenu obligatoires' });
            return;
        }
        let target: AnnouncementTarget;
        if (targetType === 'all') {
            target = { type: 'all' };
        } else {
            const values = targetValues.split(',').map(v => v.trim()).filter(Boolean);
            if (values.length === 0) {
                toast({ variant: 'destructive', title: 'Cible vide', description: 'Indiquez au moins une valeur.' });
                return;
            }
            target = { type: targetType, values: values as any };
        }

        setBusy(true);
        try {
            await createAnnouncement(firestore, {
                title: title.trim(),
                content: content.trim(),
                severity,
                target,
                publishAt: new Date(publishAt).toISOString(),
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
                createdBy: user?.uid ?? '',
                createdByName: user?.displayName ?? 'Super-admin',
            });
            toast({ title: 'Annonce publiée' });
            resetForm();
            setOpen(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: err?.message });
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer définitivement cette annonce ?')) return;
        try {
            await deleteAnnouncement(firestore, id);
            toast({ title: 'Annonce supprimée' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: err?.message });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Annonces plateforme</h1>
                    <p className="text-sm text-muted-foreground">
                        Bannières affichées dans le dashboard des écoles ciblées.
                    </p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Nouvelle annonce
                </Button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
            ) : announcements.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        Aucune annonce. Créez la première pour informer les écoles.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {announcements.map(a => {
                        const meta = SEVERITY_META[a.severity];
                        const Icon = meta.icon;
                        const active = isAnnouncementActive(a);
                        return (
                            <Card key={a.id} className={cn(!active && 'opacity-60')}>
                                <CardHeader className="flex flex-row items-start justify-between gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg border', meta.tone)}>
                                                <Icon className="h-3.5 w-3.5" />
                                            </span>
                                            {a.title}
                                            {!active && <Badge variant="outline">Inactive</Badge>}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Publication : {format(new Date(a.publishAt), 'd MMM yyyy HH:mm', { locale: fr })}
                                            {a.expiresAt && ` · Expire : ${format(new Date(a.expiresAt), 'd MMM yyyy HH:mm', { locale: fr })}`}
                                        </CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-sm whitespace-pre-wrap">{a.content}</p>
                                    <div className="flex flex-wrap gap-1 text-xs">
                                        <Badge variant="secondary">Cible : {a.target.type}</Badge>
                                        {a.target.type !== 'all' && (a.target as any).values?.map((v: string) => (
                                            <Badge key={v} variant="outline" className="font-mono">{v}</Badge>
                                        ))}
                                        <Badge variant="outline">Vu/ignoré par {a.dismissedBy?.length ?? 0}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Nouvelle annonce plateforme</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Titre</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Maintenance prévue le …" />
                        </div>
                        <div>
                            <Label>Contenu</Label>
                            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Détails à communiquer aux écoles…" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Sévérité</Label>
                                <Select value={severity} onValueChange={v => setSeverity(v as AnnouncementSeverity)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Information</SelectItem>
                                        <SelectItem value="warning">Avertissement</SelectItem>
                                        <SelectItem value="critical">Critique</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Cible</Label>
                                <Select value={targetType} onValueChange={v => setTargetType(v as AnnouncementTarget['type'])}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes les écoles</SelectItem>
                                        <SelectItem value="plan">Par plan d'abonnement</SelectItem>
                                        <SelectItem value="status">Par statut d'abonnement</SelectItem>
                                        <SelectItem value="school">Liste d'écoles précises</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {targetType !== 'all' && (
                            <div>
                                <Label>
                                    Valeurs (séparées par virgule) —
                                    {targetType === 'plan' && ' ex: Essentiel, Pro, Premium'}
                                    {targetType === 'status' && ' ex: active, expired, past_due'}
                                    {targetType === 'school' && ' ex: schoolId1, schoolId2'}
                                </Label>
                                <Input value={targetValues} onChange={e => setTargetValues(e.target.value)} />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Publication</Label>
                                <Input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} />
                            </div>
                            <div>
                                <Label>Expiration (optionnel)</Label>
                                <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreate} disabled={busy}>Publier</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
