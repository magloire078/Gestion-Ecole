
import { Bus, Ticket, Map, LayoutDashboard } from 'lucide-react';

export const transportNavLinks = [
  { href: '/dashboard/transport/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/transport/lignes', label: 'Lignes', icon: Map },
  { href: '/dashboard/transport/bus', label: 'Flotte de Bus', icon: Bus },
  { href: '/dashboard/transport/abonnements', label: 'Abonnements', icon: Ticket },
];
