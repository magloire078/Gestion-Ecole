'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Send, ShieldCheck, User } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    markConversationRead,
    sendConversationMessage,
    type ConversationMessageDoc,
    type ConversationSenderRole,
} from '@/services/conversation-service';

interface ConversationThreadProps {
    schoolId: string;
    schoolName?: string;
    viewerRole: ConversationSenderRole;
    viewerId: string;
    viewerName: string;
    /** Hauteur de la zone de messages (par défaut 480px). */
    height?: number;
    emptyHint?: string;
}

export function ConversationThread({
    schoolId,
    schoolName,
    viewerRole,
    viewerId,
    viewerName,
    height = 480,
    emptyHint = 'Aucun message pour le moment. Envoyez le premier !',
}: ConversationThreadProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const messagesQuery = useMemo(
        () => query(
            collection(firestore, `school_conversations/${schoolId}/messages`),
            orderBy('createdAt', 'asc'),
        ),
        [firestore, schoolId],
    );

    const { data: messagesData, loading } = useCollection(messagesQuery);

    const messages = useMemo(
        () => messagesData?.map(d => ({ id: d.id, ...(d.data() as ConversationMessageDoc) })) || [],
        [messagesData],
    );

    useEffect(() => {
        if (!loading && schoolId) {
            markConversationRead(firestore, schoolId, viewerRole).catch(() => {
                /* lecture optimiste, on ignore */
            });
        }
    }, [firestore, schoolId, viewerRole, loading, messages.length]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            await sendConversationMessage({
                firestore,
                schoolId,
                schoolName,
                senderId: viewerId,
                senderName: viewerName,
                senderRole: viewerRole,
                text,
            });
            setText('');
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Envoi impossible', description: err?.message });
        } finally {
            setSending(false);
        }
    };

    return (
        <Card className="flex flex-col overflow-hidden">
            <CardContent className="p-0 flex flex-col" style={{ height }}>
                <ScrollArea className="flex-1">
                    <div ref={scrollRef} className="p-4 space-y-3">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground gap-2 py-12">
                                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
                            </div>
                        ) : messages.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-12 italic">
                                {emptyHint}
                            </p>
                        ) : (
                            messages.map(msg => {
                                const mine = msg.senderRole === viewerRole;
                                const isAdmin = msg.senderRole === 'admin';
                                return (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            'flex flex-col max-w-[80%] gap-1',
                                            mine ? 'ml-auto items-end' : 'items-start',
                                        )}
                                    >
                                        <div className="flex items-end gap-2">
                                            {!mine && (
                                                <div className={cn(
                                                    'h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-white',
                                                    isAdmin ? 'bg-violet-600' : 'bg-primary',
                                                )}>
                                                    {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    'rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words',
                                                    mine
                                                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                        : 'bg-muted rounded-bl-sm',
                                                )}
                                            >
                                                {msg.text}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground px-9">
                                            {msg.senderName}
                                            {msg.createdAt?.seconds ? ` · ${format(msg.createdAt.seconds * 1000, 'd MMM HH:mm', { locale: fr })}` : ''}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
                <form onSubmit={onSubmit} className="border-t p-3 flex gap-2 items-end bg-background">
                    <Textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Écrire un message…"
                        rows={2}
                        className="resize-none min-h-[44px]"
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSubmit(e);
                            }
                        }}
                    />
                    <Button type="submit" disabled={sending || !text.trim()} className="shrink-0 h-11">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
