
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ShieldCheck, BarChart3, Building, Users, Wallet, Shield, Settings } from 'lucide-react';
import { Logo } from '@/components/logo';

const adminNavLinks = [
    { href: '/admin/system/dashboard', label: 'Vue d\'ensemble', icon: BarChart3 },
    { href: '/admin/system/schools', label: 'Écoles', icon: Building },
    { href: '/admin/system/admins', label: 'Administrateurs', icon: Users },
    // { href: '/admin/system/billing', label: 'Facturation', icon: Wallet },
    // { href: '/admin/system/logs', label: 'Logs', icon: Shield },
    { href: '/admin/system/settings', label: 'Paramètres', icon: Settings },
];


export default function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen w-full bg-muted/40">
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
             <div className="flex h-16 shrink-0 items-center border-b px-6">
                 <div className="flex items-center gap-2 font-bold text-lg">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <span>Admin Système</span>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
                {adminNavLinks.map(link => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "group flex items-center gap-x-3 rounded-lg p-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                isActive && "bg-accent text-accent-foreground"
                            )}
                        >
                            <div className="flex h-6 w-6 items-center justify-center">
                                <link.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                            </div>
                            <span>{link.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </aside>
        <main className="sm:pl-60">
            <div className="p-4 sm:p-6 lg:p-8">
                {children}
            </div>
        </main>
    </div>
  );
}
