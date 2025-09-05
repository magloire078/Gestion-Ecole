'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mockPerformanceData } from '@/lib/data';

const chartData = mockPerformanceData;

export function PerformanceChart() {
  return (
    <Card className="col-span-1 lg:col-span-4">
      <CardHeader>
        <CardTitle>Aperçu des performances</CardTitle>
        <CardDescription>Comparaison des notes moyennes par matière ce semestre par rapport au précédent.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip 
                        contentStyle={{
                            background: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                        }}
                    />
                    <Legend />
                    <Bar dataKey="Semestre Précédent" fill="hsl(var(--secondary-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Ce Semestre" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
