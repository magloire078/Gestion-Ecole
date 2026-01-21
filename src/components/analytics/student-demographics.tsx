'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { differenceInYears } from 'date-fns';
import type { student as Student } from '@/lib/data-types';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))'];

export function StudentDemographics({ schoolId }: { schoolId: string }) {
  const firestore = useFirestore();
  const studentsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves`), where('status', '==', 'Actif')), [firestore, schoolId]);
  const { data: studentsData, loading } = useCollection(studentsQuery);

  const { genderData, ageData } = useMemo(() => {
    if (!studentsData) return { genderData: [], ageData: [] };

    const students = studentsData.map(doc => doc.data() as Student);
    
    // Gender data
    const genderCounts = students.reduce((acc, student) => {
      const gender = student.gender || 'Non défini';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const genderChartData = Object.entries(genderCounts).map(([name, value]) => ({ name, value }));

    // Age data
    const today = new Date();
    const ageCounts = students.reduce((acc, student) => {
      if (student.dateOfBirth) {
        const age = differenceInYears(today, new Date(student.dateOfBirth));
        if (!isNaN(age)) {
          acc[age] = (acc[age] || 0) + 1;
        }
      }
      return acc;
    }, {} as Record<number, number>);
    const ageChartData = Object.entries(ageCounts).map(([age, count]) => ({ name: `${age} ans`, 'Élèves': count })).sort((a,b) => parseInt(a.name) - parseInt(b.name));

    return { genderData: genderChartData, ageData: ageChartData };
  }, [studentsData]);

  if (loading) {
    return <Skeleton className="h-72 w-full" />;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Démographie des Élèves</CardTitle>
        <CardDescription>Répartition par sexe et par âge.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48">
            <h4 className="text-sm font-semibold text-center mb-2">Répartition par Sexe</h4>
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value} élèves`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
         <div className="h-48">
            <h4 className="text-sm font-semibold text-center mb-2">Répartition par Âge</h4>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false}/>
                    <Tooltip formatter={(value: number) => `${value} élèves`} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="Élèves" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
