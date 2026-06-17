'use client';

import { useMemo, useState } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building, MessageSquare, Search, ShieldCheck } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ConversationThread } from '@/components/messaging/conversation-thread';
import { cn } from '@/lib/utils';
import type { SchoolConversationDoc } from '@/services/conversation-service';

interface ConvoRow extends SchoolConversationDoc {
    id: string;
}

export default function AdminMessagesPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const convosQuery = useMemo(
        () => (user?.profile?.isAdmin
            ? query(collection(firestore, 'school_conversations'), orderBy('updatedAt', 'desc'))
            : null),
        [firestore, user?.profile?.isAdmin],
    );
    const { data: convosData, loading } = useCollection(convosQuery);

    const convos: ConvoRow[] = useMemo(
        () => convosData?.map(d => ({ id: d.id, ...(d.data() as SchoolConversationDoc) })) || [],
        [convosData],
    );

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return convos;
        return convos.filter(c =>
            (c.schoolName ?? '').toLowerCase().includes(term) ||
            c.id.toLowerCase().includes(term),
        );
    }, [convos, search]);

    const selected = useMemo(
        () => convos.find(c => c.id === selectedSchoolId) ?? null,
        [convos, selectedSchoolId],
    );

    const totalUnread = useMemo(
        () => convos.reduce((acc, c) => acc + (c.unreadByAdmin || 0), 0),
        [convos],
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight">Messagerie super-admin</h1>
                <p className="text-sm text-muted-foreground">
                    Discussions privées avec les directeurs des écoles abonnées.
                    {totalUnread > 0 && (
                        <Badge variant="destructive" className="ml-2">{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</Badge>
                    )}
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
                <Card className="flex flex-col">
                    <CardHeader className="space-y-3 pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" /> Conversations
                            <Badge variant="outline" className="ml-auto text-[10px]">{convos.length}</Badge>
                        </CardTitle>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher…"
                                className="pl-9"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                        <ScrollArea className="h-[500px]">
                            <div className="p-2 space-y-1">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))
                                ) : filtered.length === 0 ? (
                                    <p className="py-12 text-center text-sm text-muted-foreground italic">
                                        {search ? 'Aucun résultat.' : 'Aucune conversation pour le moment.'}
                                    </p>
                                ) : (
                                    filtered.map(c => {
                                        const isActive = c.id === selectedSchoolId;
                                        const lastFromDirector = c.lastMessage?.senderRole === 'director';
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => setSelectedSchoolId(c.id)}
                                                className={cn(
                                                    'w-full text-left rounded-xl border p-3 transition-colors',
                                                    isActive ? 'bg-primary/5 border-primary/30' : 'border-transparent hover:bg-muted/50',
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                            <Building className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold truncate">
                                                                {c.schoolName ?? `École ${c.id.slice(0, 6)}`}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground truncate">
                                                                {lastFromDirector ? '👤 ' : '🛡️ '}
                                                                {c.lastMessage?.text ?? '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {c.unreadByAdmin > 0 && (
                                                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">
                                                            {c.unreadByAdmin}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {c.updatedAt?.seconds && (
                                                    <p className="text-[10px] text-muted-foreground mt-1 pl-11">
                                                        {formatDistanceToNow(c.updatedAt.seconds * 1000, { addSuffix: true, locale: fr })}
                                                    </p>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {selected ? (
                    <div className="space-y-2">
                        <Card>
                            <CardContent className="flex items-center gap-3 p-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                    <Building className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold truncate">{selected.schoolName ?? 'École'}</p>
                                    <p className="text-xs text-muted-foreground font-mono truncate">{selected.id}</p>
                                </div>
                                <Badge variant="outline" className="gap-1">
                                    <ShieldCheck className="h-3 w-3" /> Vue super-admin
                                </Badge>
                            </CardContent>
                        </Card>

                        <ConversationThread
                            schoolId={selected.id}
                            schoolName={selected.schoolName}
                            viewerRole="admin"
                            viewerId={user?.uid ?? ''}
                            viewerName={user?.displayName ?? 'Super-admin'}
                            height={560}
                            emptyHint="Envoyez un premier message pour ouvrir le canal."
                        />
                    </div>
                ) : (
                    <Card className="flex items-center justify-center" style={{ minHeight: 560 }}>
                        <CardDescription className="text-center px-8">
                            Sélectionnez une conversation dans la liste pour répondre à un directeur.
                        </CardDescription>
                    </Card>
                )}
            </div>
        </div>
    );
}
