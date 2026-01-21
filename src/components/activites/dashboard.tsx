'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users, List, Calendar } from 'lucide-react';
import type { activite, inscriptionActivite, competition } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    loading: boolean;
}

const StatCard = ({ title, value, icon: Icon, loading }: StatCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

export function ActivitesDashboard({ schoolId }: { schoolId: string }) {
    const firestore = useFirestore();

    const activitesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/activites`)), [firestore, schoolId]);
    const inscriptionsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/inscriptions_activites`)), [firestore, schoolId]);
    const competitionsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/competitions`), orderBy('date', 'asc')), [firestore, schoolId]);

    const { data: activitesData, loading: activitesLoading } = useCollection(activitesQuery);
    const { data: inscriptionsData, loading: inscriptionsLoading } = useCollection(inscriptionsQuery);
    const { data: competitionsData, loading: competitionsLoading } = useCollection(competitionsQuery);

    const stats = {
        activities: activitesData?.length || 0,
        inscriptions: inscriptionsData?.length || 0,
        competitions: competitionsData?.length || 0,
    };

    const upcomingCompetitions = useMemo(() => {
        if (!competitionsData) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return competitionsData
            .map(doc => ({ id: doc.id, ...doc.data() } as competition & { id: string }))
            .filter(c => new Date(c.date) >= today)
            .slice(0, 5);
    }, [competitionsData]);

    const loading = activitesLoading || inscriptionsLoading || competitionsLoading;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Activités proposées" value={stats.activities} icon={Trophy} loading={loading} />
                <StatCard title="Inscriptions totales" value={stats.inscriptions} icon={Users} loading={loading} />
                <StatCard title="Compétitions prévues" value={stats.competitions} icon={List} loading={loading} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5"/>Prochaines Compétitions</CardTitle>
                    <CardDescription>Les 5 prochains événements à venir.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                        ) : upcomingCompetitions.length > 0 ? (
                            upcomingCompetitions.map(comp => (
                                <div key={comp.id} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div>
                                        <p className="font-semibold">{comp.name}</p>
                                        <p className="text-sm text-muted-foreground">{comp.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{format(new Date(comp.date), 'd MMMM yyyy', { locale: fr })}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-4">Aucune compétition à venir.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
