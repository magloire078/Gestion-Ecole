'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User, Bot, CheckCircle2, Phone, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VisitorChat {
    id: string;
    visitorId?: string;
    status: 'active' | 'closed';
    messages?: {
        role: 'user' | 'bot' | 'support';
        text: string;
        time: string;
    }[];
    lastMessageAt?: { seconds: number; nanoseconds: number } | any;
}

export function AdminChatPanel() {
    const firestore = useFirestore();
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [previousChatCount, setPreviousChatCount] = useState(0);

    const chatQuery = useMemo(() =>
        query(collection(firestore, 'visitor_chats'), orderBy('lastMessageAt', 'desc')),
        [firestore]);

    const { data: chatsData, loading } = useCollection(chatQuery);
    const chats = useMemo(() =>
        chatsData?.map(d => ({ id: d.id, ...d.data() } as VisitorChat)) || [],
        [chatsData]
    );

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio('/sounds/notification.mp3'); // We'll need to enable this or use a data URI
    }, []);

    // Play sound on new message
    useEffect(() => {
        if (loading) return;

        // Simple logic: if a chat moves to top or count increases, and it involves a user message
        // Ideally we compare snapshots, but checking if the top chat has a new user message is a good proxy
        const topChat = chats[0];
        if (topChat && topChat.messages && topChat.messages.length > 0) {
            const lastMsg = topChat.messages[topChat.messages.length - 1];
            // If the last message is from user and very recent (mock check)
            // A better way is to track "processed" messages or just check if the data changed significantly
            // ensuring we don't beep on initial load
            if (chats.length > previousChatCount && previousChatCount !== 0) {
                // New chat started
                // playSound();
            }
        }
        setPreviousChatCount(chats.length);

        // Scan for unread messages (last message is 'user') in open chats?
        const hasUnread = chats.some(c => c.status === 'active' && c.messages && c.messages[c.messages.length - 1].role === 'user');
        // if (hasUnread) ...
    }, [chats, loading, previousChatCount]);

    const selectedChat = chats.find(c => c.id === selectedChatId);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedChatId) return;

        const chatRef = doc(firestore, 'visitor_chats', selectedChatId);
        await updateDoc(chatRef, {
            messages: arrayUnion({
                role: 'support',
                text: replyText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }),
            lastMessageAt: serverTimestamp(),
            status: 'active'
        });

        setReplyText('');
    };

    const closeChat = async (id: string) => {
        const chatRef = doc(firestore, 'visitor_chats', id);
        await updateDoc(chatRef, { status: 'closed' });
    };

    return (
        <div className="flex h-[600px] gap-4">
            {/* Liste des conversations */}
            <Card className="w-1/3 flex flex-col overflow-hidden border-border/50">
                <CardHeader className="p-4 border-b bg-muted/30">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Discussions Live
                        <Badge variant="secondary" className="ml-auto text-xs">
                            {chats.filter(c => c.status === 'active').length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                        {loading && (
                            <div className="p-4 text-center text-xs text-muted-foreground italic flex flex-col items-center gap-2">
                                <span className="animate-spin text-primary">●</span> Chargement...
                            </div>
                        )}
                        {!loading && chats.length === 0 && (
                            <div className="p-8 text-center text-xs text-muted-foreground italic">
                                Aucune discussion trouvée.
                            </div>
                        )}
                        {chats.map((chat: VisitorChat) => {
                            const lastMsg = chat.messages?.[chat.messages.length - 1];
                            const isUnread = lastMsg?.role === 'user';

                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                    className={cn(
                                        "p-3 rounded-xl cursor-pointer transition-all border relative overflow-hidden group",
                                        selectedChatId === chat.id
                                            ? "bg-primary/5 border-primary/20 shadow-sm"
                                            : "hover:bg-muted/50 border-transparent",
                                        isUnread ? "bg-white dark:bg-slate-900 border-l-4 border-l-primary font-medium" : "opacity-80"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold truncate pr-2 flex items-center gap-1">
                                            {isUnread && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                                            Visiteur #{chat.visitorId?.slice(0, 5) || chat.id.slice(0, 5)}
                                        </span>
                                        <Badge
                                            variant={chat.status === 'active' ? 'default' : 'outline'}
                                            className={cn("text-[8px] h-4 px-1", chat.status === 'closed' && "opacity-50")}
                                        >
                                            {chat.status === 'active' ? 'En cours' : 'Clos'}
                                        </Badge>
                                    </div>
                                    <p className={cn(
                                        "text-[10px] truncate",
                                        isUnread ? "text-foreground font-medium" : "text-muted-foreground"
                                    )}>
                                        {lastMsg?.role === 'user' ? '👤 ' : '🛠️ '}
                                        {lastMsg?.text || "Nouvelle conversation"}
                                    </p>
                                    <div className="text-[8px] text-zinc-400 mt-2 flex justify-between items-center">
                                        <span>{chat.lastMessageAt?.seconds ? format(chat.lastMessageAt.seconds * 1000, 'HH:mm', { locale: fr }) : 'Aujourd\'hui'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </Card>

            {/* Fenêtre de chat */}
            <Card className="flex-1 flex flex-col overflow-hidden border-border/50 shadow-lg">
                {selectedChat ? (
                    <>
                        <CardHeader className="p-4 border-b flex flex-row items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                                    <User className="w-4 h-4" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm">Visiteur #{selectedChat.visitorId?.slice(0, 5)}</CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn("h-1.5 w-1.5 rounded-full", selectedChat.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
                                        <p className="text-[10px] text-muted-foreground font-medium lowercase">
                                            {selectedChat.status === 'active' ? 'Session active' : 'Session close'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => closeChat(selectedChat.id)}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Clore
                                </Button>
                            </div>
                        </CardHeader>
                        <ScrollArea className="flex-1 p-4 bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="space-y-4">
                                {selectedChat.messages?.map((msg: any, i: number) => {
                                    const isSupport = msg.role === 'bot' || msg.role === 'support';
                                    return (
                                        <div
                                            key={i}
                                            className={cn(
                                                "flex flex-col max-w-[85%]",
                                                isSupport ? "ml-auto items-end" : "items-start"
                                            )}
                                        >
                                            <div className="flex items-end gap-2">
                                                {!isSupport && (
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                        <User className="w-3 h-3 text-slate-500" />
                                                    </div>
                                                )}
                                                <div className={cn(
                                                    "px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm",
                                                    isSupport
                                                        ? "bg-[#0C365A] text-white rounded-tr-none"
                                                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none"
                                                )}>
                                                    {msg.text}
                                                </div>
                                                {isSupport && (
                                                    <div className="w-6 h-6 rounded-full bg-[#0C365A] flex items-center justify-center shrink-0">
                                                        <UserCog className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className={cn(
                                                "text-[9px] text-zinc-400 mt-1 px-9",
                                                isSupport ? "text-right" : "text-left"
                                            )}>
                                                {msg.time}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                        <form onSubmit={handleSendReply} className="p-3 border-t bg-background flex gap-2 items-end">
                            <Input
                                placeholder="Écrire une réponse..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="flex-1 bg-muted/30 focus-visible:ring-1 min-h-[44px]"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="h-11 w-11 bg-[#0C365A] hover:bg-[#124d80] rounded-xl shrink-0 transition-all shadow-md active:scale-95"
                                disabled={!replyText.trim()}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-in fade-in zoom-in duration-300 bg-muted/10">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-sm font-medium text-foreground/80">Aucune discussion sélectionnée</p>
                        <p className="text-xs max-w-[200px] text-center mt-1 opacity-70">Sélectionnez une discussion dans la liste pour voir les messages et répondre.</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
