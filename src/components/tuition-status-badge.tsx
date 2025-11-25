'use client';

import { Badge } from "@/components/ui/badge";

type TuitionStatus = 'Soldé' | 'En retard' | 'Partiel';

export const TuitionStatusBadge = ({ status }: { status: TuitionStatus }) => {
  const statusConfig = {
    'Soldé': "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 dark:bg-emerald-900/50 dark:text-emerald-300",
    'En retard': "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    'Partiel': "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/50 dark:text-amber-300",
  }
  const statusClasses = statusConfig[status] || "secondary";

  return <Badge className={statusClasses}>{status}</Badge>;
};
