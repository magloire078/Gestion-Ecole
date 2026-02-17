'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User, Bot, CheckCircle2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VisitorChat {
    id: string;
    visitorId?: string;
    status: 'active' | 'closed';
    messages?: {
        role: 'user' | 'bot';
        text: string;
        time: string;
    }[];
    lastMessageAt?: { seconds: number; nanoseconds: number } | any;
}

export function AdminChatPanel() {
    const firestore = useFirestore();
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    const chatQuery = useMemo(() =>
        query(collection(firestore, 'visitor_chats'), orderBy('lastMessageAt', 'desc')),
        [firestore]);

    const { data: chatsData, loading } = useCollection(chatQuery);
    const chats = useMemo(() =>
        chatsData?.map(d => ({ id: d.id, ...d.data() } as VisitorChat)) || [],
        [chatsData]
    );

    const selectedChat = chats.find(c => c.id === selectedChatId);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedChatId) return;

        const chatRef = doc(firestore, 'visitor_chats', selectedChatId);
        await updateDoc(chatRef, {
            messages: arrayUnion({
                role: 'bot',
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
            <Card className="w-1/3 flex flex-col overflow-hidden">
                <CardHeader className="p-4 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Discussions Live
                    </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                        {loading && (
                            <div className="p-4 text-center text-xs text-muted-foreground italic">
                                Chargement des discussions...
                            </div>
                        )}
                        {!loading && chats.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground italic">
                                Aucune discussion active.
                            </div>
                        )}
                        {chats.map((chat: VisitorChat) => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                className={cn(
                                    "p-3 rounded-xl cursor-pointer transition-all border",
                                    selectedChatId === chat.id
                                        ? "bg-primary/5 border-primary/20"
                                        : "hover:bg-slate-50 border-transparent"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold truncate pr-2">
                                        Visiteur #{chat.visitorId?.slice(0, 5) || chat.id.slice(0, 5)}
                                    </span>
                                    <Badge variant={chat.status === 'active' ? 'default' : 'secondary'} className="text-[9px] h-4 px-1">
                                        {chat.status === 'active' ? 'En cours' : 'Clos'}
                                    </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {chat.messages?.[chat.messages.length - 1]?.text}
                                </p>
                                <div className="text-[8px] text-zinc-400 mt-2">
                                    {chat.lastMessageAt?.seconds ? format(chat.lastMessageAt.seconds * 1000, 'HH:mm', { locale: fr }) : 'Aujourd\'hui'}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </Card>

            {/* Fenêtre de chat */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                {selectedChat ? (
                    <>
                        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm">Visiteur #{selectedChat.visitorId?.slice(0, 5)}</CardTitle>
                                    <p className="text-[10px] text-emerald-500 font-medium lowercase">Session active</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1.5"
                                    onClick={() => closeChat(selectedChat.id)}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Clore
                                </Button>
                            </div>
                        </CardHeader>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {selectedChat.messages?.map((msg: any, i: number) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex flex-col max-w-[85%]",
                                            msg.role === 'bot' ? "ml-auto items-end" : "items-start"
                                        )}
                                    >
                                        <div className={cn(
                                            "px-4 py-2 rounded-2xl text-xs leading-relaxed",
                                            msg.role === 'bot'
                                                ? "bg-[#0C365A] text-white rounded-tr-none"
                                                : "bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200"
                                        )}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-1">{msg.time}</span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <form onSubmit={handleSendReply} className="p-4 border-t bg-slate-50/50 flex gap-2">
                            <Input
                                placeholder="Répondre au visiteur..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="flex-1 bg-white"
                            />
                            <Button type="submit" size="icon" className="bg-[#0C365A] hover:bg-[#124d80]" disabled={!replyText.trim()}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-in fade-in zoom-in duration-300">
                        <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm italic">Sélectionnez une discussion pour répondre</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
