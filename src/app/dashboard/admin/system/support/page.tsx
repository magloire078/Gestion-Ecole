'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, LifeBuoy } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { AdminChatPanel } from '@/components/admin/admin-chat-panel';
import { SupportTicketList } from '@/components/support/ticket-list';
import type { support_ticket as SupportTicket } from '@/lib/data-types';

export default function AdminSupportPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    // Check if user is Super Admin
    const isSuperAdmin = user?.profile?.isSuperAdmin;
    const canManageTickets = user?.profile?.permissions?.manageSupportTickets;
    const { schoolId } = useSchoolData();

    const ticketsBaseQuery = useMemo(() => {
        if (isSuperAdmin) {
            return query(collection(firestore, 'support_tickets'), orderBy('submittedAt', 'desc'));
        }
        if (canManageTickets && schoolId) {
            return query(
                collection(firestore, 'support_tickets'), 
                where('schoolId', '==', schoolId), 
                orderBy('submittedAt', 'desc')
            );
        }
        return null;
    }, [firestore, isSuperAdmin, canManageTickets, schoolId]);

    const { data: ticketsData, loading: ticketsLoading } = useCollection(ticketsBaseQuery);

    const tickets = useMemo(() =>
        ticketsData?.map(d => ({ id: d.id, ...d.data() } as SupportTicket & { id: string })) || [],
        [ticketsData]);

    const openTickets = useMemo(() => tickets.filter(t => t.status === 'open' || t.status === 'in_progress'), [tickets]);
    const closedTickets = useMemo(() => tickets.filter(t => t.status === 'closed'), [tickets]);

    const isLoading = userLoading || ticketsLoading;

    if (!isSuperAdmin && !canManageTickets) {
        return <div className="p-4 md:p-6 text-center text-red-500">Accès refusé. Réservé aux administrateurs.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Administration du Support</h1>
                    <p className="text-muted-foreground">
                        Gérez les tickets de support des directeurs et les discussions live avec les visiteurs.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="live-chat">
                <TabsList>
                    <TabsTrigger value="live-chat" className="gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Live Chat (Visiteurs)
                    </TabsTrigger>
                    <TabsTrigger value="tickets-open" className="gap-2">
                        <LifeBuoy className="w-4 h-4" />
                        Tickets Ouverts ({openTickets.length})
                    </TabsTrigger>
                    <TabsTrigger value="tickets-closed">
                        Tickets Fermés ({closedTickets.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="live-chat" className="mt-4">
                    <AdminChatPanel />
                </TabsContent>

                <TabsContent value="tickets-open" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            <SupportTicketList tickets={openTickets} isLoading={isLoading} isAdminView={true} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tickets-closed" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            <SupportTicketList tickets={closedTickets} isLoading={isLoading} isAdminView={true} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
