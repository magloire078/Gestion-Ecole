'use client';

import { Users, School, GraduationCap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    loading: boolean;
    color: string;
    bgColor: string;
    gradient: string;
    index: number;
}

/**
 * Même habillage "Hyper-Premium" que les tuiles du tableau de bord
 * (src/components/dashboard/stat-cards.tsx) : badge d'icône teinté, lueur
 * dégradée au survol, grand chiffre en font-black. Pas de lien/CTA ici — ces
 * tuiles résument la page courante, elles ne mènent nulle part ailleurs.
 */
const StatCard = ({ title, value, icon: Icon, description, loading, color, bgColor, gradient, index }: StatCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
        className="h-full"
    >
        <div className="group relative p-[1px] rounded-2xl overflow-hidden h-full">
            <div className={cn(
                "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm",
                gradient
            )} />
            <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-2xl h-full overflow-hidden shadow-sm">
                <div className={cn("absolute -right-6 -top-6 w-24 h-24 blur-[50px] rounded-full opacity-20 pointer-events-none", bgColor)} />

                <div className="relative z-10 flex items-center justify-between gap-2 p-4 pb-1.5 sm:p-5 sm:pb-2">
                    <p className="min-w-0 truncate text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {title}
                    </p>
                    <div className={cn("shrink-0 p-2 sm:p-2.5 rounded-xl shadow-sm transition-transform duration-500 group-hover:scale-110", bgColor)}>
                        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", color)} />
                    </div>
                </div>

                <div className="relative z-10 p-4 pt-1 sm:p-5 sm:pt-2">
                    {loading ? (
                        <Skeleton className="h-7 w-16 sm:h-9 sm:w-20" />
                    ) : (
                        <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                            {value}
                        </div>
                    )}
                    {description && !loading && (
                        <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1 truncate">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    </motion.div>
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
    const cards: Omit<StatCardProps, 'loading' | 'index'>[] = [
        {
            title: 'Élèves affichés',
            value: stats.total,
            icon: Users,
            description: 'Basé sur les filtres actifs',
            color: 'text-indigo-600 dark:text-indigo-400',
            bgColor: 'bg-indigo-100/60 dark:bg-indigo-900/30',
            gradient: 'from-indigo-500/20 to-violet-500/20',
        },
        {
            title: 'Garçons / Filles',
            value: `${stats.boys} / ${stats.girls}`,
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100/60 dark:bg-blue-900/30',
            gradient: 'from-blue-500/20 to-sky-500/20',
        },
        {
            title: 'Classes',
            value: stats.classes,
            icon: School,
            description: `${stats.classes} classe${stats.classes > 1 ? 's' : ''} au total.`,
            color: 'text-violet-600 dark:text-violet-400',
            bgColor: 'bg-violet-100/60 dark:bg-violet-900/30',
            gradient: 'from-violet-500/20 to-indigo-500/20',
        },
        {
            title: 'Cycles',
            value: stats.cycles,
            icon: GraduationCap,
            description: `${stats.cycles} cycle${stats.cycles > 1 ? 's' : ''} au total.`,
            color: 'text-sky-600 dark:text-sky-400',
            bgColor: 'bg-sky-100/60 dark:bg-sky-900/30',
            gradient: 'from-sky-500/20 to-blue-500/20',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 print:hidden">
            {cards.map((card, index) => (
                <StatCard key={card.title} {...card} loading={isLoading} index={index} />
            ))}
        </div>
    );
}
