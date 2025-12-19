
import { GanttChartSquare, Wrench, KeyRound, CalendarCheck, DoorOpen, Building, LayoutGrid } from 'lucide-react';

export const immobilierNavLinks = [
  { href: '/dashboard/immobilier/dashboard', label: 'Tableau de bord', icon: LayoutGrid },
  { href: '/dashboard/immobilier/inventaire', label: 'Inventaire', icon: GanttChartSquare },
  { href: '/dashboard/immobilier/plan', label: 'Bâtiments', icon: Building },
  { href: '/dashboard/immobilier/salles', label: 'Salles', icon: DoorOpen },
  { href: '/dashboard/immobilier/reservations', label: 'Réservations', icon: CalendarCheck },
  { href: '/dashboard/immobilier/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/dashboard/immobilier/cles', label: 'Gestion des clés', icon: KeyRound },
];
