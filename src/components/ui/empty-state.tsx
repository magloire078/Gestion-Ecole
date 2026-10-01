'use client';

import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
}

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: EmptyStateAction;
    /** Version plus compacte (dans une cellule de tableau ou une grille), sans marge verticale excessive. */
    compact?: boolean;
    className?: string;
}

/**
 * État vide générique ("pending"/placeholder) aligné sur le design system
 * Hyper-Premium : icône sur fond indigo, titre en font-black, description
 * en slate-500, CTA optionnel. À utiliser à la place d'un simple texte
 * ("Aucun élève trouvé.") partout où une liste peut être vide.
 */
export function EmptyState({ icon: Icon, title, description, action, compact, className }: EmptyStateProps) {
    const ActionIcon = action?.icon;
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
                'flex flex-col items-center justify-center text-center',
                compact ? 'py-10 px-6' : 'py-16 px-6',
                className,
            )}
        >
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-4 shadow-sm shadow-indigo-100/50 dark:shadow-none">
                <Icon className={cn('text-indigo-400 dark:text-indigo-300', compact ? 'h-8 w-8' : 'h-10 w-10')} strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-sm mt-1.5">{description}</p>
            {action && (
                <Button
                    onClick={action.onClick}
                    variant="outline"
                    className="mt-6 rounded-xl border-slate-200 dark:border-slate-700 font-bold hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 dark:hover:bg-indigo-900/20 transition-all"
                >
                    {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                    {action.label}
                </Button>
            )}
        </motion.div>
    );
}
