
'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, School, GraduationCap, UserCheck } from 'lucide-react';
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description?: string;
    loading: boolean;
    iconBg?: string;
    iconColor?: string;
}

const StatCard = ({ title, value, icon: Icon, description, loading, iconBg = "bg-indigo-50 dark:bg-indigo-950/40", iconColor = "text-indigo-600 dark:text-indigo-400" }: StatCardProps) => (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 truncate">{title}</span>
            <div className={cn("p-1.5 sm:p-2 rounded-xl shrink-0", iconBg, iconColor)}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
        </div>
        <div>
            {loading ? (
                <Skeleton className="h-7 w-20 rounded-lg" />
            ) : (
                <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {value}
                </div>
            )}
            {description && !loading && (
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                    {description}
                </p>
            )}
        </div>
    </div>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 print:hidden">
            <StatCard 
                title="Élèves affichés" 
                value={stats.total} 
                icon={Users} 
                loading={isLoading} 
                description="Filtres actifs" 
                iconBg="bg-blue-50 dark:bg-blue-950/40"
                iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard 
                title="Garçons / Filles" 
                value={`${stats.boys} / ${stats.girls}`} 
                icon={UserCheck} 
                loading={isLoading}
                description="Effectifs par sexe"
                iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard 
                title="Classes" 
                value={stats.classes} 
                icon={School} 
                loading={isLoading} 
                description={`${stats.classes} au total`} 
                iconBg="bg-amber-50 dark:bg-amber-950/40"
                iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard 
                title="Cycles" 
                value={stats.cycles} 
                icon={GraduationCap} 
                loading={isLoading} 
                description={`${stats.cycles} cycles`} 
                iconBg="bg-purple-50 dark:bg-purple-950/40"
                iconColor="text-purple-600 dark:text-purple-400"
            />
        </div>
    );
}
