
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts';
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


export function AccountingCharts({ transactions }: AccountingChartsProps) {

  const { monthlyData, categoryData, chartConfig } = useMemo(() => {
    if (!transactions || transactions.length === 0) return { monthlyData: [], categoryData: { revenue: [], expense: [] }, chartConfig: {} };
    
    const groupedByMonth = group(transactions, d => d.date.substring(0, 7)); // 'YYYY-MM'
    
    const monthly = Array.from(groupedByMonth, ([month, values]) => {
      const revenue = sum(values.filter(v => v.type === 'Revenu'), d => d.amount);
      const expense = sum(values.filter(v => v.type === 'Dépense'), d => d.amount);
      return { month, revenus: revenue, depenses: expense };
    }).sort((a, b) => a.month.localeCompare(b.month));

     const revenueByCategory = group(transactions.filter(t => t.type === 'Revenu'), d => d.category);
     const expenseByCategory = group(transactions.filter(t => t.type === 'Dépense'), d => d.category);

     const revenue = Array.from(revenueByCategory, ([name, values]) => ({
        name,
        value: sum(values, d => d.amount),
        fill: COLORS_REVENUE[Math.floor(Math.random() * COLORS_REVENUE.length)]
     })).sort((a,b) => b.value - a.value);

     const expense = Array.from(expenseByCategory, ([name, values]) => ({
        name,
        value: sum(values, d => d.amount),
        fill: COLORS_EXPENSE[Math.floor(Math.random() * COLORS_EXPENSE.length)]
     })).sort((a,b) => b.value - a.value);
     
     const config: ChartConfig = {
        revenus: { label: 'Revenus', color: 'hsl(var(--chart-2))' },
        depenses: { label: 'Dépenses', color: 'hsl(var(--destructive))' },
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
            <CardHeader>
                <CardTitle>Revenus vs Dépenses Mensuels</CardTitle>
                <CardDescription>Comparaison des flux financiers sur les derniers mois.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={monthlyData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltipContent />
                        <Legend />
                        <Bar dataKey="revenus" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="depenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
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
                            />
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
