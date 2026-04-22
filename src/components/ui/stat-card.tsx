'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description?: string;
    loading: boolean;
    colorClass?: string;
}

export const StatCard = ({ title, value, icon: Icon, description, loading, colorClass }: StatCardProps) => (
    <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/40 dark:border-slate-800/40 shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 group rounded-3xl overflow-hidden border-t-white/80 dark:border-t-slate-700/50">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
                    {loading ? (
                        <Skeleton className="h-9 w-24 rounded-lg" />
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
                        </div>
                    )}
                </div>
                <div className={cn(
                    "p-3 rounded-2xl transition-all duration-500 shadow-sm group-hover:scale-110 group-hover:rotate-3",
                    colorClass || "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                )}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {description && !loading && (
                <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/30 rounded-full w-full" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight whitespace-nowrap">
                        {description}
                    </span>
                </div>
            )}
        </CardContent>
    </Card>
);
