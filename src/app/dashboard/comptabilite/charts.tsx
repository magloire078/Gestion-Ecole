
'use client';
import { cn } from "@/lib/utils";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Pie, PieChart, Cell, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';
import { group, sum } from 'd3-array';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

interface AccountingTransaction {
    id: string;
    date: string;
    description: string;
    category: string;
    type: 'Revenu' | 'Dépense';
    amount: number;
}

interface AccountingChartsProps {
    transactions: AccountingTransaction[];
    recoveryRate?: number;
}

const COLORS_REVENUE = ['hsl(var(--chart-2))', '#34d399', '#6ee7b7', '#a7f3d0'];
const COLORS_EXPENSE = ['hsl(var(--destructive))', '#fb7185', '#fda4af', '#fecdd3'];

// Helper to render custom labels for pie charts
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't render label for small slices

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


export function AccountingCharts({ transactions, recoveryRate }: AccountingChartsProps) {

    const { monthlyData, categoryData, chartConfig } = useMemo(() => {
        if (!transactions || transactions.length === 0) return { monthlyData: [], categoryData: { revenue: [], expense: [] }, chartConfig: {} };

        const groupedByMonth = group(transactions, d => d.date.substring(0, 7)); // 'YYYY-MM'

        const monthlySummaries = Array.from(groupedByMonth, ([month, values]) => {
            const revenus = sum(values.filter((v: AccountingTransaction) => v.type === 'Revenu'), (d: AccountingTransaction) => d.amount);
            const depenses = sum(values.filter((v: AccountingTransaction) => v.type === 'Dépense'), (d: AccountingTransaction) => d.amount);
            return { month, revenus, depenses };
        }).sort((a, b) => a.month.localeCompare(b.month));

        let cumulativeBalance = 0;
        const monthly = monthlySummaries.map(item => {
            cumulativeBalance += (item.revenus - item.depenses);
            return { ...item, tresorerie: cumulativeBalance };
        });

        const revenueByCategory = group(transactions.filter(t => t.type === 'Revenu'), d => d.category);
        const expenseByCategory = group(transactions.filter(t => t.type === 'Dépense'), d => d.category);

        const revenue = Array.from(revenueByCategory, ([name, values], index) => ({
            name,
            value: sum(values, d => d.amount),
            fill: COLORS_REVENUE[index % COLORS_REVENUE.length]
        })).sort((a, b) => b.value - a.value);

        const expense = Array.from(expenseByCategory, ([name, values], index) => ({
            name,
            value: sum(values, d => d.amount),
            fill: COLORS_EXPENSE[index % COLORS_EXPENSE.length]
        })).sort((a, b) => b.value - a.value);

        const config: ChartConfig = {
            revenus: { label: 'Revenus', color: 'hsl(var(--chart-2))' },
            depenses: { label: 'Dépenses', color: 'hsl(var(--destructive))' },
            tresorerie: { label: 'Trésorerie Cumulée', color: '#2D9CDB' },
        };

        revenue.forEach(item => {
            config[item.name] = { label: item.name, color: item.fill };
        });
        expense.forEach(item => {
            config[item.name] = { label: item.name, color: item.fill };
        });

        return { monthlyData: monthly, categoryData: { revenue, expense }, chartConfig: config };

    }, [transactions]);

    if (transactions.length === 0) {
        return null;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
            <Card className="col-span-1 lg:col-span-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle>Evolution de la Trésorerie</CardTitle>
                        <CardDescription>Flux financier net cumulé au fil des mois.</CardDescription>
                    </div>
                    {recoveryRate !== undefined && (
                        <div className="text-right">
                            <div className="text-sm font-medium text-muted-foreground">Recouvrement</div>
                            <div className={cn("text-2xl font-bold", recoveryRate > 80 ? "text-emerald-500" : recoveryRate > 50 ? "text-blue-500" : "text-destructive")}>
                                {recoveryRate.toFixed(1)}%
                            </div>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="colorTresor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2D9CDB" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#2D9CDB" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Area type="monotone" dataKey="tresorerie" stroke="#2D9CDB" strokeWidth={3} fillOpacity={1} fill="url(#colorTresor)" />
                            <Area type="monotone" dataKey="revenus" stroke="hsl(var(--chart-2))" strokeWidth={1} fill="transparent" />
                            <Area type="monotone" dataKey="depenses" stroke="hsl(var(--destructive))" strokeWidth={1} fill="transparent" />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Répartition des Revenus</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[150px] w-full">
                            <PieChart>
                                <ChartTooltipContent nameKey="name" />
                                <Pie
                                    data={categoryData.revenue}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={60}
                                    innerRadius={40}
                                    paddingAngle={5}
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                >
                                    {categoryData.revenue.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Répartition des Dépenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[150px] w-full">
                            <PieChart>
                                <ChartTooltipContent nameKey="name" />
                                <Pie
                                    data={categoryData.expense}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={60}
                                    innerRadius={40}
                                    paddingAngle={5}
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                >
                                    {categoryData.expense.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
