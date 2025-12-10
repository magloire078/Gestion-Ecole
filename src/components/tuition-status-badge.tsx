"use client";

import { Badge } from "@/components/ui/badge";

type TuitionStatus = 'Soldé' | 'En retard' | 'Partiel';

interface TuitionStatusBadgeProps {
  status: TuitionStatus;
  amount?: number | null;
}

export const TuitionStatusBadge = ({ status, amount }: TuitionStatusBadgeProps) => {
  const statusConfig = {
    'Soldé': "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 dark:bg-emerald-900/50 dark:text-emerald-300",
    'En retard': "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    'Partiel': "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/50 dark:text-amber-300",
  }
  const statusClasses = statusConfig[status] || "secondary";

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('fr-FR')} CFA`;
  }

  return (
    <Badge className={statusClasses}>
      <span>{status}</span>
      {amount !== null && amount !== undefined && (
        <span className="ml-2 font-mono text-xs opacity-75">
          ({formatCurrency(amount)})
        </span>
      )}
    </Badge>
  );
};
