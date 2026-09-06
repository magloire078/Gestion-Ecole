'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Target, Trash2, UserPlus } from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Commercial {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export function CommercialAccessTable() {
    const auth = useAuth();
    const { toast } = useToast();
    const [commercials, setCommercials] = useState<Commercial[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGrantOpen, setIsGrantOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [granting, setGranting] = useState(false);
    const [revokeTarget, setRevokeTarget] = useState<Commercial | null>(null);
    const [revoking, setRevoking] = useState(false);

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
            const res = await authedFetch('/api/admin/commercial');
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Chargement impossible', description: body.error || `HTTP ${res.status}` });
                return;
            }
            setCommercials(body.commercials ?? []);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setLoading(false);
        }
    }, [authedFetch, toast]);

    useEffect(() => { load(); }, [load]);

    const handleGrant = async (e: FormEvent) => {
        e.preventDefault();
        setGranting(true);
        try {
            const res = await authedFetch('/api/admin/commercial', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Impossible d\'accorder l\'accès', description: body.error || `HTTP ${res.status}` });
                return;
            }
            toast({ title: 'Accès accordé', description: `${body.displayName || body.email} peut maintenant gérer les prospects.` });
            setEmail('');
            setIsGrantOpen(false);
            await load();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setGranting(false);
        }
    };

    const handleRevoke = async () => {
        if (!revokeTarget) return;
        setRevoking(true);
        try {
            const res = await authedFetch('/api/admin/commercial', {
                method: 'DELETE',
                body: JSON.stringify({ uid: revokeTarget.uid }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'Impossible de révoquer', description: body.error || `HTTP ${res.status}` });
                return;
            }
            toast({ title: 'Accès révoqué' });
            await load();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur réseau', description: err?.message });
        } finally {
            setRevoking(false);
            setRevokeTarget(null);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Accès Commercial</CardTitle>
                    <CardDescription>
                        Accès restreint au pipeline prospects uniquement — pas de facturation, pas d&apos;abonnements des écoles, pas de gestion des autres administrateurs.
                    </CardDescription>
                </div>
                <Dialog open={isGrantOpen} onOpenChange={setIsGrantOpen}>
                    <DialogTrigger asChild>
                        <Button><UserPlus className="h-4 w-4 mr-2" />Accorder l&apos;accès</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleGrant}>
                            <DialogHeader>
                                <DialogTitle>Accorder l&apos;accès commercial</DialogTitle>
                                <DialogDescription>
                                    La personne doit déjà avoir un compte (via la page d&apos;inscription) avec cet email.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Input
                                    type="email"
                                    placeholder="email@exemple.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={granting}>
                                    {granting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Accorder
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Commercial</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(2)].map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            ))
                        ) : commercials && commercials.length > 0 ? (
                            commercials.map(c => (
                                <TableRow key={c.uid}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={c.photoURL || undefined} />
                                                <AvatarFallback>{(c.displayName || c.email || '?').substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{c.displayName || '—'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setRevokeTarget(c)}>
                                            <Trash2 className="h-4 w-4 mr-2" />Révoquer
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Aucun accès commercial accordé.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Révoquer l&apos;accès commercial ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>{revokeTarget?.displayName || revokeTarget?.email}</strong> perdra l&apos;accès au pipeline prospects.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevoke} disabled={revoking} className="bg-destructive hover:bg-destructive/90">
                            {revoking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Révoquer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
