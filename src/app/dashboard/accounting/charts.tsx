

'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';
import { group, sum } from 'd3-array';

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

const COLORS_REVENUE = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
const COLORS_EXPENSE = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3'];

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

  const monthlyData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    const groupedByMonth = group(transactions, d => d.date.substring(0, 7)); // 'YYYY-MM'
    
    const data = Array.from(groupedByMonth, ([month, values]) => {
      const revenue = sum(values.filter(v => v.type === 'Revenu'), d => d.amount);
      const expense = sum(values.filter(v => v.type === 'Dépense'), d => d.amount);
      return { month, revenue, expense };
    });

    return data.sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const categoryData = useMemo(() => {
     if (!transactions || transactions.length === 0) return { revenue: [], expense: [] };
     
     const revenueByCategory = group(transactions.filter(t => t.type === 'Revenu'), d => d.category);
     const expenseByCategory = group(transactions.filter(t => t.type === 'Dépense'), d => d.category);

     const revenue = Array.from(revenueByCategory, ([name, values]) => ({
        name,
        value: sum(values, d => d.amount)
     })).sort((a,b) => b.value - a.value);

     const expense = Array.from(expenseByCategory, ([name, values]) => ({
        name,
        value: sum(values, d => d.amount)
     })).sort((a,b) => b.value - a.value);

     return { revenue, expense };

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
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip 
                                contentStyle={{
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                }}
                            />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenus" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Dépenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
        
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Répartition des Revenus</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[150px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
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
                                        <Cell key={`cell-${index}`} fill={COLORS_REVENUE[index % COLORS_REVENUE.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)",
                                    }}
                                />
                                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="text-base">Répartition des Dépenses</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[150px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
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
                                        <Cell key={`cell-${index}`} fill={COLORS_EXPENSE[index % COLORS_EXPENSE.length]} />
                                    ))}
                                </Pie>
                                 <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)",
                                    }}
                                />
                                <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

    