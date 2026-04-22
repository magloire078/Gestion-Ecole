'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, FileText, Send } from "lucide-react";
import Link from "next/link";
import { motion } from 'framer-motion';
import { useUser } from "@/firebase";

export function QuickActions() {
    const { user } = useUser();
    const canManageUsers = user?.profile?.permissions?.manageUsers;
    const canManageGrades = user?.profile?.permissions?.manageGrades;
    const canManageCommunication = user?.profile?.permissions?.manageCommunication;

    const actions = [
        { href: '/dashboard/inscription', label: 'Nouvelle Inscription', icon: UserPlus, permission: canManageUsers },
        { href: '/dashboard/notes', label: 'Saisie des Notes', icon: FileText, permission: canManageGrades },
        { href: '/dashboard/messagerie', label: 'Envoyer un Message', icon: Send, permission: canManageCommunication },
    ].filter(action => action.permission);

    if (actions.length === 0) {
        return null; // Ne rien afficher si l'utilisateur n'a aucune permission pour ces actions
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="h-full"
        >
            <Card className="glass-card border-white/10 bg-card/40 backdrop-blur-2xl shadow-2xl relative overflow-hidden h-full">
                {/* Secondary Background Glow */}
                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-50" />
                
                <CardHeader>
                    <CardTitle className="text-xl font-black tracking-tight">Accès Rapides</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col space-y-3">
                    {actions.map((action, index) => (
                        <motion.div
                            key={action.href}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                        >
                            <Button 
                                variant="outline" 
                                className="w-full justify-between h-12 border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group rounded-xl px-4" 
                                asChild
                            >
                                <Link href={action.href}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                            <action.icon className="h-4 w-4" />
                                        </div>
                                        <span className="font-bold text-[13px]">{action.label}</span>
                                    </div>
                                    <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                        <Send className="w-3 h-3 rotate-45" />
                                    </div>
                                </Link>
                            </Button>
                        </motion.div>
                    ))}
                </CardContent>
            </Card>
        </motion.div>
    );
}
