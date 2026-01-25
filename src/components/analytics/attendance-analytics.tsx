'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { absence as Absence } from '@/lib/data-types';
import { format, subDays } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))'];

export function AttendanceAnalytics({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();

  // Get today's date on the client to avoid hydration mismatch
  const [todayString, setTodayString] = useState('');
  useEffect(() => {
    setTodayString(format(new Date(), 'yyyy-MM-dd'));
  }, []);
  
  // Query for absences in the last 30 days for efficiency
  const thirtyDaysAgo = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);
  
  const absencesQuery = useMemo(() => 
    query(
      collection(firestore, `ecoles/${schoolId}/absences`),
      where('date', '>=', thirtyDaysAgo)
    ), 
  [firestore, schoolId, thirtyDaysAgo]);

  const studentsQuery = useMemo(() => 
    query(
        collection(firestore, `ecoles/${schoolId}/eleves`),
        where('status', '==', 'Actif')
    ), 
  [firestore, schoolId]);

  const { data: absencesData, loading: absencesLoading } = useCollection(absencesQuery);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  
  const { total, justified, unjustified, presenceRate } = useMemo(() => {
    if (!absencesData || !studentsData || !todayString) return { total: 0, justified: 0, unjustified: 0, presenceRate: 0 };
    
    const absences = absencesData.map(doc => doc.data() as Absence);
    const totalActiveStudents = studentsData.length;

    // Stats for the pie chart (last 30 days)
    const totalAbsencesInPeriod = absences.length;
    const justifiedInPeriod = absences.filter(a => a.justified).length;
    const unjustifiedInPeriod = totalAbsencesInPeriod - justifiedInPeriod;

    // Stats for today's presence rate
    const todayAbsencesCount = absences.filter(a => a.date === todayString).length;
    
    let rate = 0;
    if (totalActiveStudents > 0) {
      const presentToday = totalActiveStudents - todayAbsencesCount;
      rate = (presentToday / totalActiveStudents) * 100;
    }

    return {
      total: totalAbsencesInPeriod, 
      justified: justifiedInPeriod, 
      unjustified: unjustifiedInPeriod, 
      presenceRate: rate
    };
  }, [absencesData, studentsData, todayString]);
  
  const chartData = [
    { name: 'Justifiées', value: justified },
    { name: 'Non Justifiées', value: unjustified },
  ];

  const loading = absencesLoading || studentsLoading;

  if (loading) {
    return <Skeleton className="h-72 w-full" />;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyse des Absences</CardTitle>
        <CardDescription>Vue d'ensemble sur les absences des 30 derniers jours.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
         <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (percent < 0.05) return null;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x  = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                const y = cy  + radius * Math.sin(-midAngle * Math.PI / 180);
                return (
                  <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                    {`%${(percent * 100).toFixed(0)}`}
                  </text>
                );
              }}>
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
            <p className="text-sm text-muted-foreground">Total Absences (30j)</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="text-sm text-muted-foreground">Taux de Présence (Aujourd'hui)</p>
            <p className="text-2xl font-bold text-emerald-600">{presenceRate.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
