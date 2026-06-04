'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModuleSubNavLink {
    href: string;
    label: string;
    icon: LucideIcon;
}

interface ModuleSubNavProps {
    links: ModuleSubNavLink[];
    className?: string;
}

export function ModuleSubNav({ links, className }: ModuleSubNavProps) {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Navigation du module"
            className={cn(
                'relative -mx-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 p-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-white/10 dark:from-slate-900/40 dark:via-slate-900/20 dark:to-slate-900/40',
                className,
            )}
        >
            <ul className="flex items-center gap-1">
                {links.map(link => {
                    const isActive =
                        pathname === link.href ||
                        (link.href !== '/' && pathname.startsWith(link.href + '/'));
                    const Icon = link.icon;
                    return (
                        <li key={link.href} className="flex-1 min-w-fit">
                            <Link
                                href={link.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    'group relative flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
                                    isActive
                                        ? 'bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/20'
                                        : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white',
                                )}
                            >
                                <Icon
                                    className={cn(
                                        'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
                                        isActive ? 'text-primary-foreground' : 'text-slate-500 dark:text-slate-400',
                                    )}
                                />
                                <span>{link.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
