'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { SupportTicketForm } from '@/components/support/ticket-form';
import { SupportTicketList } from '@/components/support/ticket-list';
import type { support_ticket as SupportTicket } from '@/lib/data-types';

export default function SupportPage() {
    const { user, loading: userLoading } = useUser();
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    const [isFormOpen, setIsFormOpen] = useState(false);

    // Query for tickets created BY CURRENT USER only
    const ticketsQuery = useMemo(() =>
        user?.uid && schoolId ?
            query(
                collection(firestore, 'support_tickets'),
                where('schoolId', '==', schoolId),
                where('userId', '==', user.uid),
                orderBy('submittedAt', 'desc')
            ) : null,
        [firestore, schoolId, user?.uid]);

    const { data: ticketsData, loading: ticketsLoading } = useCollection(ticketsQuery);

    const tickets = useMemo(() =>
        ticketsData?.map(d => ({ id: d.id, ...d.data() } as SupportTicket & { id: string })) || [],
        [ticketsData]);

    const openTickets = useMemo(() => tickets.filter(t => t.status === 'open' || t.status === 'in_progress'), [tickets]);
    const closedTickets = useMemo(() => tickets.filter(t => t.status === 'closed'), [tickets]);

    const isLoading = userLoading || schoolLoading || ticketsLoading;

    return (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Support Technique</h1>
                        <p className="text-muted-foreground">Suivez vos demandes d'assistance.</p>
                    </div>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nouveau Ticket
                        </Button>
                    </DialogTrigger>
                </div>

                <Tabs defaultValue="open">
                    <TabsList>
                        <TabsTrigger value="open">Mes Tickets Ouverts ({openTickets.length})</TabsTrigger>
                        <TabsTrigger value="closed">Mes Tickets Fermés ({closedTickets.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="open" className="mt-4">
                        <Card>
                            <CardContent className="p-0">
                                <SupportTicketList tickets={openTickets} isLoading={isLoading} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="closed" className="mt-4">
                        <Card>
                            <CardContent className="p-0">
                                <SupportTicketList tickets={closedTickets} isLoading={isLoading} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ouvrir un nouveau ticket</DialogTitle>
                    <DialogDescription>
                        Décrivez votre demande aussi précisément que possible. Notre équipe vous répondra dans les plus brefs délais.
                    </DialogDescription>
                </DialogHeader>
                <SupportTicketForm onSave={() => setIsFormOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

