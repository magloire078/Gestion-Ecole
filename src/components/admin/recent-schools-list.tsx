
'use client';
import { useMemo } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { school as School } from '@/lib/data-types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export function RecentSchoolsList() {
    const firestore = useFirestore();
    const { user } = useUser();

    const schoolsQuery = useMemo(() =>
        user?.profile?.isAdmin ? query(collection(firestore, 'ecoles'), orderBy('createdAt', 'desc'), limit(5)) : null
        , [firestore, user?.profile?.isAdmin]);

    const { data: schoolsData, loading } = useCollection(schoolsQuery);

    const recentSchools = useMemo(() =>
        schoolsData?.map(doc => ({ id: doc.id, ...doc.data() as School })) || []
        , [schoolsData]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Nouvelles Écoles</CardTitle>
                    <CardDescription>Les 5 derniers établissements inscrits.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nouvelles Écoles</CardTitle>
                <CardDescription>Les 5 derniers établissements inscrits.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recentSchools.map(school => (
                        <div key={school.id} className="flex items-center">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={school.mainLogoUrl || undefined} alt={school.name} />
                                <AvatarFallback>{school.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="ml-4 space-y-1">
                                <p className="text-sm font-medium leading-none">{school.name}</p>
                                <p className="text-sm text-muted-foreground">{school.directorEmail}</p>
                            </div>
                            <div className="ml-auto font-medium text-sm text-muted-foreground">
                                {school.createdAt ? (
                                    (() => {
                                        try {
                                            const date = school.createdAt?.toDate ? school.createdAt.toDate() : new Date(school.createdAt);
                                            return formatDistanceToNow(date, { addSuffix: true, locale: fr });
                                        } catch (e) {
                                            return 'Date invalide';
                                        }
                                    })()
                                ) : 'Date inconnue'}
                            </div>
                        </div>
                    ))}
                    {recentSchools.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Aucune école inscrite pour le moment.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
