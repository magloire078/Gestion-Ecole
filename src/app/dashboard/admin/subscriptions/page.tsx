
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { useHydrationFix } from '@/hooks/use-hydration-fix';


interface School {
    id: string;
    name: string;
    createdAt: { seconds: number; nanoseconds: number };
    subscription: {
        plan: 'Essentiel' | 'Pro';
        status: 'active' | 'trialing' | 'past_due' | 'canceled';
    };
}

// UID de l'administrateur principal de la plateforme
const ADMIN_UID = "5H3lZic8t7dBa127LclkKrHW03M2"; 

export default function AdminSubscriptionsPage() {
    const isMounted = useHydrationFix();
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const schoolsQuery = useMemoFirebase(() => query(collection(firestore, 'ecoles'), orderBy('createdAt', 'desc')), [firestore]);
    const { data: schoolsData, loading: schoolsLoading } = useCollection(schoolsQuery);

    const schools: School[] = schoolsData?.map(doc => ({ id: doc.id, ...doc.data() } as School)) || [];

    useEffect(() => {
        if (!userLoading && (!user || user.uid !== ADMIN_UID)) {
            toast({
                variant: 'destructive',
                title: 'Accès non autorisé',
                description: "Vous n'avez pas les droits pour accéder à cette page."
            });
            router.push('/dashboard');
        }
    }, [user, userLoading, router, toast]);

    const isLoading = userLoading || schoolsLoading;

    if (!isMounted || isLoading || !user || user.uid !== ADMIN_UID) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getPlanBadgeVariant = (plan: string) => {
        switch (plan) {
            case 'Pro':
                return 'default';
            case 'Essentiel':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active':
            case 'trialing':
                return 'secondary';
            case 'past_due':
            case 'canceled':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Administration des Abonnements</h1>
                <p className="text-muted-foreground">
                    Vue d'ensemble des abonnements de toutes les écoles inscrites.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des Écoles</CardTitle>
                    <CardDescription>
                        {schools.length} école(s) trouvée(s).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de l'école</TableHead>
                                <TableHead>Date de création</TableHead>
                                <TableHead>Plan d'abonnement</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schools.length > 0 ? (
                                schools.map((school) => (
                                    <TableRow key={school.id}>
                                        <TableCell className="font-medium">{school.name}</TableCell>
                                        <TableCell>
                                            {isMounted && school.createdAt ? format(new Date(school.createdAt.seconds * 1000), 'd MMMM yyyy', { locale: fr }) : <Skeleton className="h-5 w-24" />}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getPlanBadgeVariant(school.subscription?.plan)}>
                                                {school.subscription?.plan || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                             <Badge variant={getStatusBadgeVariant(school.subscription?.status)}>
                                                {school.subscription?.status || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Aucune école n'a encore été créée.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
