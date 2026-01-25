'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, School, GraduationCap } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description?: string;
    loading: boolean;
}

const StatCard = ({ title, value, icon: Icon, description, loading }: StatCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
            {description && !loading && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

interface StudentsStatsCardsProps {
    stats: {
        total: number;
        boys: number;
        girls: number;
        classes: number;
        cycles: number;
    };
    isLoading: boolean;
}

export function StudentsStatsCards({ stats, isLoading }: StudentsStatsCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print:hidden">
            <StatCard title="Élèves affichés" value={stats.total} icon={Users} loading={isLoading} description="Basé sur les filtres actifs" />
            <StatCard title="Garçons / Filles" value={`${stats.boys} / ${stats.girls}`} icon={Users} loading={isLoading} />
            <StatCard title="Classes" value={stats.classes} icon={School} loading={isLoading} description={`${stats.classes} classes au total.`} />
            <StatCard title="Cycles" value={stats.cycles} icon={GraduationCap} loading={isLoading} description={`${stats.cycles} cycles au total.`} />
        </div>
    );
}
