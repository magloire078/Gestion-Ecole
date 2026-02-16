'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageCircle, X, Send, User, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { doc, collection, query, where, limit, onSnapshot, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useDoc, useFirestore } from '@/firebase';
import { system_setting as SystemSetting } from '@/lib/data-types';
import { MessageSquare } from 'lucide-react';

export function LiveChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string, time: string }[]>([
        { role: 'bot', text: 'Bonjour ! Bienvenue sur Gérecole. Comment puis-je vous aider aujourd\'hui ?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const firestore = useFirestore();

    // Récupérer ou générer un visitorId unique
    const visitorId = useMemo(() => {
        if (typeof window === 'undefined') return 'server';
        let id = localStorage.getItem('gerecole_visitor_id');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('gerecole_visitor_id', id);
        }
        return id;
    }, []);

    const { data: systemSettings } = useDoc<SystemSetting>(
        doc(firestore, 'system_settings/default')
    );

    const whatsappNumber = systemSettings?.supportWhatsApp || '+2250102030405';

    // Synchronisation des messages depuis Firestore
    useEffect(() => {
        if (!isOpen) return;

        // On cherche une session active pour ce visiteur
        const q = query(
            collection(firestore, 'visitor_chats'),
            where('visitorId', '==', visitorId),
            where('status', '==', 'active'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docData = snapshot.docs[0].data();
                setChatId(snapshot.docs[0].id);
                if (docData.messages) {
                    setMessages(docData.messages);
                }
            }
        });

        return () => unsubscribe();
    }, [isOpen, visitorId, firestore]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Notification automatique après 5 secondes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isOpen) {
                // On pourrait ajouter un indicateur visuel ici
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMessage = {
            role: 'user' as const,
            text: inputValue,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Mise à jour locale immédiate
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInputValue('');
        setIsTyping(true);

        // Persistance Firestore
        const persistMessage = async () => {
            try {
                let currentChatId = chatId;
                if (chatId) {
                    const chatRef = doc(firestore, 'visitor_chats', chatId);
                    await updateDoc(chatRef, {
                        messages: arrayUnion(newUserMessage),
                        lastMessageAt: serverTimestamp()
                    });
                } else {
                    const newChatRef = doc(collection(firestore, 'visitor_chats'));
                    await setDoc(newChatRef, {
                        visitorId,
                        messages: [
                            { role: 'bot', text: 'Bonjour ! Bienvenue sur Gérecole. Comment puis-je vous aider aujourd\'hui ?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                            newUserMessage
                        ],
                        status: 'active',
                        createdAt: serverTimestamp(),
                        lastMessageAt: serverTimestamp()
                    });
                    currentChatId = newChatRef.id;
                    setChatId(currentChatId);
                }

                // Envoi vers WhatsApp via notre API proxy
                fetch('/api/support/chat/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: inputValue,
                        visitorId: visitorId,
                        chatId: currentChatId
                    })
                }).catch(err => console.error("Error sending to WhatsApp:", err));

            } catch (err) {
                console.error("Error persisting chat message:", err);
            }
        };

        persistMessage();

        const getBotResponse = (input: string) => {
            const lowerInput = input.toLowerCase();
            if (lowerInput.includes('prix') || lowerInput.includes('tarif') || lowerInput.includes('combien')) {
                return "Nos tarifs commencent à 1 500 CFA par élève et par mois. Vous pouvez consulter notre section 'Tarifs' pour plus de détails sur les options.";
            }
            if (lowerInput.includes('démo') || lowerInput.includes('essai') || lowerInput.includes('tester')) {
                return "Bien sûr ! Vous pouvez demander une démonstration personnalisée en remplissant le formulaire sur notre page Contact.";
            }
            if (lowerInput.includes('fonctionnalité') || lowerInput.includes('quoi')) {
                return "Gérecole permet de gérer les notes, les absences, le transport scolaire, la cantine, et la paie du personnel. C'est une solution tout-en-un.";
            }
            if (lowerInput.includes('parler') || lowerInput.includes('direct')) {
                return "Un de nos conseillers examinera votre demande très rapidement. En attendant, avez-vous d'autres questions ?";
            }
            return "Merci pour votre message. Un de nos conseillers examinera votre demande très rapidement. En attendant, que puis-je vous dire d'autre sur Gérecole ?";
        };

        // Réponse automatique si aucune réponse admin après 3 secondes (simulé pour l'instant)
        setTimeout(() => {
            const hasAdminResponded = false; // Idéalement on vérifierait si le dernier message est un bot/admin
            if (!hasAdminResponded) {
                const botResponseText = getBotResponse(inputValue);
                const botResponse = {
                    role: 'bot' as const,
                    text: botResponseText,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                // On n'ajoute la réponse bot que si c'est une question simple connue
                if (botResponseText !== "Merci pour votre message. Un de nos conseillers examinera votre demande très rapidement. En attendant, que puis-je vous dire d'autre sur Gérecole ?") {
                    setMessages(prev => [...prev, botResponse]);
                    if (chatId) {
                        updateDoc(doc(firestore, 'visitor_chats', chatId), {
                            messages: arrayUnion(botResponse),
                            lastMessageAt: serverTimestamp()
                        });
                    }
                }
                setIsTyping(false);
            }
        }, 3000);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-[350px] sm:w-[380px] bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-border/40 flex flex-col h-[500px]"
                    >
                        {/* Header du Chat */}
                        <div className="bg-[#0C365A] p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-white/10 overflow-hidden">
                                        <Bot className="text-white w-6 h-6" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0C365A]" />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">Support Gérecole</h4>
                                    <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">En ligne</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/70 hover:text-white transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Zone des messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50"
                        >
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                        "flex flex-col max-w-[80%]",
                                        msg.role === 'user' ? "ml-auto items-end" : "items-start"
                                    )}
                                >
                                    <div className={cn(
                                        "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                        msg.role === 'user'
                                            ? "bg-[#2D9CDB] text-white rounded-tr-none"
                                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none"
                                    )}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
                                </motion.div>
                            ))}
                            {isTyping && (
                                <div className="flex items-center gap-1 text-muted-foreground animate-pulse text-xs ml-2">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>GèreBot est en train d'écrire...</span>
                                </div>
                            )}
                        </div>


                        {/* Input Footer */}
                        <form
                            onSubmit={handleSendMessage}
                            className="p-4 bg-white dark:bg-slate-900 border-t border-border/40 flex items-center gap-2"
                        >
                            <Input
                                placeholder="Posez votre question..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="flex-1 bg-slate-50 dark:bg-slate-950 border-none focus-visible:ring-1 focus-visible:ring-primary h-11 px-4 text-sm rounded-xl"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="h-11 w-11 rounded-xl bg-[#0C365A] hover:bg-[#0C365A]/90 shrink-0"
                                disabled={!inputValue.trim() || isTyping}
                            >
                                <Send size={18} className="text-white" />
                            </Button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bouton de déclenchement */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-16 w-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(45,156,219,0.4)] transition-all duration-500",
                    isOpen ? "bg-red-500 rotate-90" : "bg-[#2D9CDB]"
                )}
            >
                {isOpen ? <X className="text-white w-7 h-7" /> : <MessageCircle className="text-white w-8 h-8" />}

                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] text-white font-bold items-center justify-center">1</span>
                    </span>
                )}
            </motion.button>
        </div>
    );
}
