'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, LifeBuoy } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { AdminChatPanel } from '@/components/admin/admin-chat-panel';
import { SupportTicketList } from '@/components/support/ticket-list';
import type { support_ticket as SupportTicket } from '@/lib/data-types';

export default function AdminSupportPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    // Check if user is Super Admin
    const isSuperAdmin = user?.profile?.isSuperAdmin;

    // Fetch ALL tickets across ALL schools (or filter as needed for system admin)
    // Here we maintain the logic of fetching tickets for the context, but a System Admin might want to see EVERYTHING.
    // For now, let's keep it consistent with previous logic but intended for the admin view.
    // If the requirement is "System Admin sees requests from Directors", they likely need to see tickets where they are the assignee or just all tickets.
    // Let's assume for now they want to see all tickets from the current school context OR all tickets globally.
    // Given the multi-tenancy, usually "System Admin" implies handling platform-wide support.
    // However, if the "System Admin" is just a role within a school, we stick to schoolId.
    // The user said "Admin Système", implying THE platform administrator.

    // If it's truly platform-wide, we shouldn't filter by schoolId. 
    // BUT current firestore rules might restrict reading 'support_tickets' to 'schoolId'.
    // Let's check firestore rules later. For now, assuming Global Admin context.

    const ticketsBaseQuery = useMemo(() =>
        query(collection(firestore, 'support_tickets'), orderBy('submittedAt', 'desc')),
        [firestore]
    );

    const { data: ticketsData, loading: ticketsLoading } = useCollection(ticketsBaseQuery);

    const tickets = useMemo(() =>
        ticketsData?.map(d => ({ id: d.id, ...d.data() } as SupportTicket & { id: string })) || [],
        [ticketsData]);

    const openTickets = useMemo(() => tickets.filter(t => t.status === 'open' || t.status === 'in_progress'), [tickets]);
    const closedTickets = useMemo(() => tickets.filter(t => t.status === 'closed'), [tickets]);

    const isLoading = userLoading || ticketsLoading;

    if (!isSuperAdmin) {
        return <div className="p-8 text-center text-red-500">Accès refusé. Réservé aux administrateurs système.</div>;
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
