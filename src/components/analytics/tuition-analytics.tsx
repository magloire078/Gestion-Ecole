'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { student as Student, class_type as Class } from '@/lib/data-types';

export function TuitionAnalytics({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const studentsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves`), where('status', '==', 'Actif')), [firestore, schoolId]);
  const classesQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/classes`)), [firestore, schoolId]);

  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: classesData, loading: classesLoading } = useCollection(classesQuery);
  
  const { chartData } = useMemo(() => {
    if (!studentsData || !classesData) return { chartData: [] };

    const students = studentsData.map(doc => doc.data() as Student);
    const classes = classesData.map(doc => ({id: doc.id, ...doc.data()} as Class & {id: string}));
    const classMap = new Map(classes.map(c => [c.id, c.name]));

    const dataByClass = students.reduce((acc, student) => {
      const className = classMap.get(student.classId || '') || 'Non assigné';
      if (!acc[className]) {
        acc[className] = { totalFees: 0, totalDue: 0 };
      }
      acc[className].totalFees += student.tuitionFee || 0;
      acc[className].totalDue += student.amountDue || 0;
      return acc;
    }, {} as Record<string, { totalFees: number, totalDue: number }>);
    
    const chart = Object.entries(dataByClass).map(([name, data]) => ({
      name,
      "Total à Payer": data.totalFees,
      "Solde Dû": data.totalDue,
      "Total Encaissé": data.totalFees - data.totalDue,
    }));

    return { chartData: chart };

  }, [studentsData, classesData]);
  
  const loading = studentsLoading || classesLoading;

  if (loading) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyse de la Scolarité</CardTitle>
        <CardDescription>Répartition des frais de scolarité et des soldes dus par classe.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString('fr-FR')} CFA`} 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="Total Encaissé" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Solde Dû" stackId="a" fill="hsl(var(--destructive))" radius={[4, 0, 0, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
