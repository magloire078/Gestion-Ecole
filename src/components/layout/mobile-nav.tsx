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

    // Un onglet couvre sa route et ses sous-routes, mais `/dashboard` préfixe
    // toutes les autres : le faire correspondre par préfixe allumait « Home »
    // en même temps que l'onglet réellement ouvert (deux onglets actifs sur
    // /dashboard/dossiers-eleves, par exemple). On ne retient donc que le
    // libellé le plus spécifique, c'est-à-dire le href correspondant le plus long.
    const activeHref = mobileMenuItems
        .filter(({ href }) => pathname === href || pathname.startsWith(href + '/'))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/80 backdrop-blur-lg border-t pb-safe">
            <div className="flex justify-around items-center h-16">
                {mobileMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === activeHref;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                "relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {/* L'onglet actif se signale par un repère, la couleur et
                                l'épaisseur du trait. Le remplissage (`fill-current`) a été
                                retiré : les icônes Lucide sont dessinées en contour, et les
                                remplir transformait la roue dentée ou les silhouettes en
                                aplats indistincts. */}
                            {isActive && (
                                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                            )}
                            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                            <span className={cn(
                                "text-[10px] uppercase tracking-wider",
                                isActive ? "font-bold" : "font-medium"
                            )}>
                                {item.title}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
