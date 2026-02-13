
'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { group, sum } from 'd3-array';
import type { staff as Staff } from '@/lib/data-types';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

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
    })).sort((a, b) => b.masseSalariale - a.masseSalariale);

  }, [staff]);

  const chartConfig: ChartConfig = {
    masseSalariale: {
      label: 'Masse Salariale',
      color: "hsl(var(--primary))",
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return `${value}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition de la Masse Salariale</CardTitle>
        <CardDescription>Visualisation de la masse salariale par rôle (en CFA).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart data={dataByRole} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="role" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} />
              <ChartTooltipContent formatter={(value: any) => `${Number(value).toLocaleString('fr-FR')} CFA`} />
              <Bar dataKey="masseSalariale" fill="var(--color-masseSalariale)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
