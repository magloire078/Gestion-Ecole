
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';

interface GradeEntry {
  subject: string;
  grade: number;
  coefficient: number;
}

interface PerformanceChartProps {
  grades: GradeEntry[];
  loading: boolean;
  error?: string | null;
}

export function PerformanceChart({ grades, loading, error }: PerformanceChartProps) {
  
  const performanceData = useMemo(() => {
    if (!grades || grades.length === 0) {
      return [];
    }

    const gradesBySubject: Record<string, { totalPoints: number; totalCoeffs: number }> = {};

    grades.forEach(g => {
        if (!gradesBySubject[g.subject]) {
            gradesBySubject[g.subject] = { totalPoints: 0, totalCoeffs: 0 };
        }
        gradesBySubject[g.subject].totalPoints += g.grade * g.coefficient;
        gradesBySubject[g.subject].totalCoeffs += g.coefficient;
    });

    const data = Object.entries(gradesBySubject).map(([subject, { totalPoints, totalCoeffs }]) => ({
      subject,
      'Moyenne': totalCoeffs > 0 ? parseFloat((totalPoints / totalCoeffs).toFixed(2)) : 0,
    }));
    
    return data.sort((a,b) => b.Moyenne - a.Moyenne);

  }, [grades]);


  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle>Performance des Classes</CardTitle>
        <CardDescription>Moyenne générale par matière pour l'ensemble de l'école.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            ) : error ? (
                 <div className="flex h-full w-full items-center justify-center">
                    <Alert variant="destructive" className="w-auto">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                 </div>
            ) : performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subject" tick={{fontSize: 12}} />
                        <YAxis domain={[0, 20]} />
                        <Tooltip 
                            contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                            }}
                        />
                        <Bar dataKey="Moyenne" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
               <div className="flex h-full w-full items-center justify-center">
                 <p className="text-muted-foreground">Aucune note disponible pour afficher les performances.</p>
               </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
