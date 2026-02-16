'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    Wallet,
    Settings
} from 'lucide-react';

const mobileMenuItems = [
    { title: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Élèves', href: '/dashboard/dossiers-eleves', icon: Users },
    { title: 'Notes', href: '/dashboard/notes', icon: GraduationCap },
    { title: 'Finance', href: '/dashboard/paiements', icon: Wallet },
    { title: 'Menu', href: '/dashboard/parametres', icon: Settings },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/80 backdrop-blur-lg border-t pb-safe">
            <div className="flex justify-around items-center h-16">
                {mobileMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                            <span className="text-[10px] font-medium uppercase tracking-wider">
                                {item.title}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
