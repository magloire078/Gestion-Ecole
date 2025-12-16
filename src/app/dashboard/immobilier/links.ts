import { Building, GanttChartSquare, Wrench, KeyRound, Map, CalendarCheck } from 'lucide-react';

export const immobilierNavLinks = [
  { href: '/dashboard/immobilier', label: 'Tableau de bord', icon: Building },
  { href: '/dashboard/immobilier/inventaire', label: 'Inventaire', icon: GanttChartSquare },
  { href: '/dashboard/immobilier/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/dashboard/immobilier/reservations', label: 'Salles', icon: CalendarCheck },
  { href: '/dashboard/immobilier/cles', label: 'Gestion des clés', icon: KeyRound },
  { href: '/dashboard/immobilier/plan', label: 'Plan des locaux', icon: Map },
];
