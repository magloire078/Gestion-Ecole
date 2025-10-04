"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BookUser, BookOpen, Wallet, Settings, CalendarClock, NotebookText, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
  { href: '/dashboard/classes', label: 'Classes', icon: BookUser },
  { href: '/dashboard/teachers', label: 'Enseignants', icon: Users },
  { href: '/dashboard/students', label: 'Élèves', icon: Users },
  { href: '/dashboard/reports', label: 'Bulletins', icon: NotebookText },
  { href: '/dashboard/timetable', label: 'Emploi du temps', icon: CalendarClock },
  { href: '/dashboard/library', label: 'Bibliothèque', icon: BookOpen },
  { href: '/dashboard/fees', label: 'Scolarité', icon: Wallet },
  { href: '/dashboard/accounting', label: 'Comptabilité', icon: Landmark },
];

export function MainNav() {
  const pathname = usePathname();
  const navClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary";
  const activeClass = "bg-muted text-primary";
  
  return (
    <nav className="flex flex-col justify-between flex-1 p-2 text-sm font-medium">
      <div className="grid gap-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(navClass, pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard') && activeClass)}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>
      <div>
        <Link
          href="/dashboard/settings"
          className={cn(navClass, pathname.startsWith('/dashboard/settings') && activeClass)}
        >
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
      </div>
    </nav>
  );
}
