"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BookUser, BookOpen, Wallet, Settings, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/classes', label: 'Classes', icon: BookUser },
  { href: '/dashboard/teachers', label: 'Enseignants', icon: Users },
  { href: '/dashboard/students', label: 'Élèves', icon: Users },
  { href: '/dashboard/timetable', label: 'Emploi du temps', icon: CalendarClock },
  { href: '/dashboard/library', label: 'Bibliothèque', icon: BookOpen },
  { href: '/dashboard/fees', label: 'Scolarité', icon: Wallet },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const navClass = "flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground";
  const activeClass = "text-foreground font-semibold";

  return (
    <nav className="grid gap-6 text-lg font-medium p-6">
      <div className="flex h-[60px] items-center">
        <Logo />
      </div>
      {menuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(navClass, pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard') && activeClass)}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
