
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
        return (
            <Card className="rounded-[40px] border-blue-50/50 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-black text-[#0C365A] font-outfit tracking-tight">Répartition Plans</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Distribution par type d'abonnement.</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <Skeleton className="h-60 w-full rounded-3xl" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="rounded-[40px] border-blue-50/50 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="p-8 pb-4">
                <CardTitle className="text-2xl font-black text-[#0C365A] font-outfit tracking-tight">Répartition Plans</CardTitle>
                <CardDescription className="text-slate-500 font-medium">Distribution par type d'abonnement.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
                <div className="h-60 w-full">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-[#0C365A] text-white p-3 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md">
                                                    <p className="text-xs font-black uppercase tracking-widest text-[#2D9CDB] mb-1">{payload[0].name}</p>
                                                    <p className="text-sm font-bold">{payload[0].value} Écoles</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                >
                                    {chartData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.fill} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    content={({ payload }) => (
                                        <div className="flex justify-center gap-4 mt-4">
                                            {payload?.map((entry: any, index: number) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}
