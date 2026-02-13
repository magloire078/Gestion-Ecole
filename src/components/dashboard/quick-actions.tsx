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
        >
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                    {actions.map((action) => (
                        <Button key={action.href} variant="outline" className="justify-start hover:bg-primary/10 transition-colors" asChild>
                            <Link href={action.href}>
                                <action.icon className="mr-2 h-4 w-4 text-primary" />
                                {action.label}
                            </Link>
                        </Button>
                    ))}
                </CardContent>
            </Card>
        </motion.div>
    );
}
