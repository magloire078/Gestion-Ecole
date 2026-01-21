'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { absence as Absence } from '@/lib/data-types';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))'];

export function AttendanceAnalytics({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const absencesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/absences`)), [firestore, schoolId]);
  const { data: absencesData, loading } = useCollection(absencesQuery);
  
  const { total, justified, unjustified } = useMemo(() => {
    if (!absencesData) return { total: 0, justified: 0, unjustified: 0 };
    const absences = absencesData.map(doc => doc.data() as Absence);
    return {
      total: absences.length,
      justified: absences.filter(a => a.justified).length,
      unjustified: absences.filter(a => !a.justified).length,
    }
  }, [absencesData]);
  
  const chartData = [
    { name: 'Justifiées', value: justified },
    { name: 'Non Justifiées', value: unjustified },
  ];

  if (loading) {
    return <Skeleton className="h-72 w-full" />;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyse des Absences</CardTitle>
        <CardDescription>Vue d'ensemble sur les absences enregistrées.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
         <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} labelLine={false} label>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value} absence(s)`} />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          <div className="p-3 border rounded-lg">
            <p className="text-sm text-muted-foreground">Total Absences</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="text-sm text-muted-foreground">Taux de Présence (estimé)</p>
            <p className="text-2xl font-bold text-emerald-600">...%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
