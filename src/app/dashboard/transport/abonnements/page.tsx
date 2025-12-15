
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import type { transportSubscription as TransportSubscription, student as Student, route as Route } from '@/lib/data-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SubscriptionWithDetails extends TransportSubscription {
    studentName?: string;
    routeName?: string;
}

export default function TransportSubscriptionsPage() {
    const { schoolId, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const canManageContent = !!user?.profile?.permissions?.manageContent;

    const subscriptionsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_abonnements`)) : null, [firestore, schoolId]);
    const { data: subscriptionsData, loading: subscriptionsLoading } = useCollection(subscriptionsQuery);

    const studentsQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [firestore, schoolId]);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

    const routesQuery = useMemoFirebase(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/transport_lignes`)) : null, [firestore, schoolId]);
    const { data: routesData, loading: routesLoading } = useCollection(routesQuery);

    const subscriptions: SubscriptionWithDetails[] = useMemo(() => {
        if (!subscriptionsData || !studentsData || !routesData) return [];
        const studentsMap = new Map(studentsData.map(doc => [doc.id, doc.data() as Student]));
        const routesMap = new Map(routesData.map(doc => [doc.id, doc.data() as Route]));

        return subscriptionsData.map(doc => {
            const sub = { id: doc.id, ...doc.data() } as TransportSubscription;
            const student = studentsMap.get(sub.studentId);
            const route = routesMap.get(sub.routeId);
            return {
                ...sub,
                studentName: student ? `${student.firstName} ${student.lastName}` : 'Élève inconnu',
                routeName: route ? route.name : 'Ligne inconnue',
            };
        });
    }, [subscriptionsData, studentsData, routesData]);
    
    const isLoading = schoolLoading || subscriptionsLoading || studentsLoading || routesLoading;

    const getStatusBadgeVariant = (status: string) => {
        switch(status) {
            case 'active': return 'secondary';
            case 'inactive': return 'outline';
            default: return 'default';
        }
    };

    const getPaymentBadgeVariant = (status?: string) => {
        switch(status) {
            case 'paid': return 'secondary';
            case 'unpaid': return 'destructive';
            default: return 'outline';
        }
    };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Abonnements au Transport</CardTitle>
                  <CardDescription>
                    Gérez les abonnements des élèves au service de transport scolaire.
                  </CardDescription>
                </div>
                {canManageContent && (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter un abonnement
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Élève</TableHead><TableHead>Ligne</TableHead><TableHead>Période</TableHead><TableHead>Statut</TableHead><TableHead>Paiement</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>)
              ) : subscriptions.length > 0 ? (
                subscriptions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.studentName}</TableCell>
                    <TableCell>{sub.routeName}</TableCell>
                    <TableCell className="capitalize">{sub.period}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(sub.status)}>{sub.status}</Badge></TableCell>
                    <TableCell><Badge variant={getPaymentBadgeVariant(sub.paymentStatus)}>{sub.paymentStatus || 'N/A'}</Badge></TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Modifier</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun abonnement trouvé.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
