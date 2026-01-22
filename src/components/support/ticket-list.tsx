'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { support_ticket as SupportTicket } from '@/lib/data-types';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface SupportTicketListProps {
  tickets: (SupportTicket & { id: string })[];
  isLoading: boolean;
}

export function SupportTicketList({ tickets, isLoading }: SupportTicketListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const canManageTickets = user?.profile?.permissions?.manageSupportTickets;

    const getStatusBadgeVariant = (status: 'open' | 'in_progress' | 'closed') => {
        switch(status) {
            case 'open': return 'default';
            case 'in_progress': return 'secondary';
            case 'closed': return 'outline';
            default: return 'outline';
        }
    };

    const handleStatusChange = async (ticketId: string, status: 'open' | 'in_progress' | 'closed') => {
        const ticketRef = doc(firestore, 'support_tickets', ticketId);
        try {
            await updateDoc(ticketRef, { status });
            toast({ title: 'Statut mis à jour' });
        } catch (e) {
             const permissionError = new FirestorePermissionError({
                path: ticketRef.path, operation: 'update', requestResourceData: { status }
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };
    
    return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sujet</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              {canManageTickets && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={canManageTickets ? 6 : 5}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                ))
            ) : tickets.length > 0 ? (
                tickets.map(ticket => (
                    <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.subject}</TableCell>
                        <TableCell>{ticket.userDisplayName}</TableCell>
                        <TableCell className="capitalize">{ticket.category.replace('_', ' ')}</TableCell>
                        <TableCell>{ticket.submittedAt ? formatDistanceToNow(new Date((ticket.submittedAt as any).seconds * 1000), { addSuffix: true, locale: fr }) : 'N/A'}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge></TableCell>
                        {canManageTickets && (
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'open')}>Marquer comme Ouvert</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'in_progress')}>Marquer comme En cours</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'closed')}>Marquer comme Fermé</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        )}
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={canManageTickets ? 6 : 5} className="h-24 text-center">Aucun ticket dans cette catégorie.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
    );
}
