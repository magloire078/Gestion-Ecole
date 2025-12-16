import { Bus, Ticket, Map } from 'lucide-react';

export const transportNavLinks = [
  { href: '/dashboard/transport', label: 'Suivi', icon: Map },
  { href: '/dashboard/transport/lignes', label: 'Lignes', icon: Map },
  { href: '/dashboard/transport/bus', label: 'Flotte de Bus', icon: Bus },
  { href: '/dashboard/transport/abonnements', label: 'Abonnements', icon: Ticket },
];
