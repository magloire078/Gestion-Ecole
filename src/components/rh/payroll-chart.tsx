'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { group, sum } from 'd3-array';
import type { staff as Staff } from '@/lib/data-types';

interface PayrollChartProps {
  staff: (Staff & { id: string })[];
}

export function PayrollChart({ staff }: PayrollChartProps) {
  const dataByRole = useMemo(() => {
    if (!staff || staff.length === 0) return [];

    const grouped = group(staff, d => d.role);
    
    return Array.from(grouped, ([role, values]) => ({
      role: role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' '),
      masseSalariale: sum(values, d => d.baseSalary || 0),
    })).sort((a,b) => b.masseSalariale - a.masseSalariale);
    
  }, [staff]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M CFA`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k CFA`;
    return `${value} CFA`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition de la Masse Salariale</CardTitle>
        <CardDescription>Visualisation de la masse salariale par rôle.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataByRole} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="role" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency}/>
              <Tooltip
                formatter={(value: number) => `${value.toLocaleString('fr-FR')} CFA`}
                contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                }}
              />
              <Bar dataKey="masseSalariale" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
