'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Utensils, Users, Ticket, CalendarClock } from 'lucide-react';
import type { canteenReservation, canteenSubscription, student } from '@/lib/data-types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryPanel } from './inventory-panel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

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

export function CantineDashboard({ schoolId }: { schoolId: string }) {
    const firestore = useFirestore();

    const [todayString, setTodayString] = useState('');
    useEffect(() => {
        setTodayString(format(new Date(), 'yyyy-MM-dd'));
    }, []);

    const reservationsQuery = useMemo(() =>
        todayString ? query(collection(firestore, `ecoles/${schoolId}/cantine_reservations`), where('date', '==', todayString)) : null,
        [firestore, schoolId, todayString]);

    const subscriptionsQuery = useMemo(() =>
        query(collection(firestore, `ecoles/${schoolId}/cantine_abonnements`), where('status', '==', 'active')),
        [firestore, schoolId]);

    const recentReservationsQuery = useMemo(() =>
        query(collection(firestore, `ecoles/${schoolId}/cantine_reservations`), orderBy('date', 'desc'), limit(5)),
        [firestore, schoolId]);

    const studentsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves`)), [firestore, schoolId]);

    const { data: reservationsData, loading: reservationsLoading } = useCollection(reservationsQuery);
    const { data: subscriptionsData, loading: subscriptionsLoading } = useCollection(subscriptionsQuery);
    const { data: recentReservationsData, loading: recentReservationsLoading } = useCollection(recentReservationsQuery);
    const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);

    const studentsMap = useMemo(() => {
        const map = new Map<string, string>();
        studentsData?.forEach(doc => {
            const s = doc.data() as student;
            map.set(doc.id, `${s.firstName} ${s.lastName}`);
        });
        return map;
    }, [studentsData]);

    const recentReservations = useMemo(() => {
        if (!recentReservationsData || !studentsMap.size) return [];
        return recentReservationsData.map(doc => {
            const data = doc.data() as canteenReservation;
            return {
                ...data,
                studentName: studentsMap.get(data.studentId) || 'Élève inconnu'
            };
        });
    }, [recentReservationsData, studentsMap]);


    const stats = {
        reservationsToday: reservationsData?.length || 0,
        activeSubscriptions: subscriptionsData?.length || 0,
    };

    const loading = reservationsLoading || subscriptionsLoading || recentReservationsLoading || studentsLoading;

    return (
        <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="inventory">Gestion des Stocks</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Réservations (Aujourd'hui)" value={stats.reservationsToday} icon={Utensils} loading={loading} />
                    <StatCard title="Abonnés Actifs" value={stats.activeSubscriptions} icon={Users} loading={loading} />
                    <StatCard title="Repas servis (Mois)" value={Math.round(stats.reservationsToday * 20)} icon={Ticket} loading={loading} />
                    <StatCard title="Revenus (Mois)" value={stats.reservationsToday * 2500 * 20} icon={Ticket} loading={loading} />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Utensils className="h-5 w-5 text-orange-500" />
                                Tendance des Réservations
                            </CardTitle>
                            <CardDescription>Évolution des 7 derniers jours</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Lun', qty: 45 },
                                    { name: 'Mar', qty: 52 },
                                    { name: 'Mer', qty: 38 },
                                    { name: 'Jeu', qty: 65 },
                                    { name: 'Ven', qty: 48 },
                                    { name: 'Sam', qty: 12 },
                                    { name: 'Dim', qty: 0 },
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <ChartTooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="qty" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-blue-500" />
                                Réservations Récentes
                            </CardTitle>
                            <CardDescription>Les 5 dernières activités</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {loading ? (
                                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                                ) : recentReservations.length > 0 ? (
                                    recentReservations.map((res, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold uppercase">
                                                    {res.studentName.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm text-slate-700">{res.studentName}</p>
                                                    <p className="text-xs text-muted-foreground">{res.mealType === 'dejeuner' ? 'Déjeuner' : 'Autre'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-sm text-slate-600">{format(new Date(res.date), 'd MMM yyyy', { locale: fr })}</p>
                                                <Badge variant={res.status === 'confirmed' ? 'secondary' : res.status === 'attended' ? 'default' : 'outline'} className="text-[10px] h-5">
                                                    {res.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">Aucune réservation récente.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="inventory">
                <InventoryPanel schoolId={schoolId} />
            </TabsContent>
        </Tabs>
    );
}
