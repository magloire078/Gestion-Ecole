'use client';

import { Badge } from "@/components/ui/badge";

type TuitionStatus = 'Soldé' | 'En retard' | 'Partiel';

export const TuitionStatusBadge = ({ status }: { status: TuitionStatus }) => {
  switch (status) {
    case 'Soldé':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Soldé</Badge>;
    case 'En retard':
      return <Badge variant="destructive">En retard</Badge>;
    case 'Partiel':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Partiel</Badge>;
    default:
      return null;
  }
};
