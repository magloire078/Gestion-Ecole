
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useHydrationFix } from '@/hooks/use-hydration-fix';
import { SchoolsTable } from '@/components/admin/schools-table';


export default function AdminSubscriptionsPage() {
    const isMounted = useHydrationFix();
    const { user, loading: userLoading } = useUser();
    const router = useRouter();

    const isAdmin = user?.profile?.isAdmin === true;

    useEffect(() => {
        if (!userLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [user, userLoading, router, isAdmin]);

    const isLoading = userLoading;

    if (!isMounted || isLoading || !isAdmin) {
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

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Gestion des Écoles</h1>
                    <p className="text-muted-foreground">
                        Vue d'ensemble de toutes les écoles inscrites sur la plateforme.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Liste des Écoles</CardTitle>
                        <CardDescription>
                            Gérez les inscriptions, les abonnements et les statuts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SchoolsTable />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
