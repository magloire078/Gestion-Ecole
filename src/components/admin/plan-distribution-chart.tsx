
'use client';
import { useMemo } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { school as School } from '@/lib/data-types';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const COLORS = {
    'Premium': 'hsl(var(--chart-1))',
    'Pro': 'hsl(var(--chart-2))',
    'Essentiel': 'hsl(var(--chart-3))',
};

export function PlanDistributionChart() {
    const firestore = useFirestore();
    const { user } = useUser();

    const schoolsQuery = useMemo(() => 
        user?.profile?.isAdmin ? query(collection(firestore, 'ecoles')) : null
    , [firestore, user?.profile?.isAdmin]);

    const { data: schoolsData, loading } = useCollection(schoolsQuery);

    const chartData = useMemo(() => {
        if (!schoolsData) return [];
        const planCounts = schoolsData.reduce((acc, doc) => {
            const school = doc.data() as School;
            const plan = school.subscription?.plan || 'Essentiel';
            acc[plan] = (acc[plan] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(planCounts).map(([name, value]) => ({
            name,
            value,
            fill: COLORS[name as keyof typeof COLORS] || 'hsl(var(--muted))'
        }));
    }, [schoolsData]);
    
    const chartConfig = useMemo(() => {
        return chartData.reduce((acc, item) => {
            acc[item.name] = { label: item.name, color: item.fill };
            return acc;
        }, {} as any);
    }, [chartData]);


    if (loading) {
        return <Skeleton className="h-72 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Répartition des Plans</CardTitle>
                <CardDescription>Distribution des écoles par plan d'abonnement.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-60 w-full">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <ChartTooltipContent 
                                    formatter={(value) => `${value} écoles`}
                                />
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                >
                                    {chartData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}
