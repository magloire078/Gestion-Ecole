
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ShieldCheck, BarChart3, Building, Users, Home, Settings, Scroll, LogOut } from 'lucide-react';
import { Logo } from '@/components/logo';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';

const adminNavLinks = [
    { href: '/admin/system/dashboard', label: 'Vue d\'ensemble', icon: BarChart3 },
    { href: '/admin/system/schools', label: 'Écoles', icon: Building },
    { href: '/admin/system/admins', label: 'Administrateurs', icon: Users },
    { href: '/admin/system/audit-log', label: 'Journaux d\'Audit', icon: Scroll },
    { href: '/admin/system/settings', label: 'Paramètres', icon: Settings },
];


export default function SystemAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen w-full bg-[#f8faff] text-slate-900 font-sans">
            {/* Decorative background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-[#2D9CDB]/5 blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-[#0C365A]/5 blur-[120px]" />
            </div>

            <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-blue-50/50 bg-white/70 backdrop-blur-xl sm:flex shadow-[20px_0_50px_rgba(12,54,90,0.02)] transition-all duration-300">
                <div className="flex h-20 shrink-0 items-center border-b border-blue-50/50 px-6 relative overflow-hidden group">
                    <AnimatedHighlight />
                    <div className="flex items-center gap-3 font-black text-xl tracking-tight text-[#0C365A] font-outfit">
                        <div className="h-10 w-10 rounded-xl bg-[#0C365A] flex items-center justify-center text-white shadow-lg shadow-blue-900/20 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <span>SYS ADMIN</span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 mt-4">
                    {adminNavLinks.map(link => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "group flex items-center gap-x-3 rounded-2xl p-3 text-sm font-bold transition-all duration-300",
                                    isActive
                                        ? "bg-[#0C365A] text-white shadow-xl shadow-blue-900/10"
                                        : "text-slate-400 hover:bg-blue-50/50 hover:text-[#2D9CDB]"
                                )}
                            >
                                <div className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                                    isActive ? "bg-white/10" : "bg-slate-50 group-hover:bg-blue-100/50"
                                )}>
                                    <link.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400 group-hover:text-[#2D9CDB]")} />
                                </div>
                                <span>{link.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2D9CDB]"
                                    />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto border-t border-blue-50/50 p-4 space-y-2">
                    <Link
                        href="/dashboard"
                        className="group flex items-center gap-x-3 rounded-2xl p-3 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-[#0C365A] transition-all"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 group-hover:bg-slate-100">
                            <Home className="h-5 w-5" />
                        </div>
                        <span>Quitter l'Admin</span>
                    </Link>
                </div>
            </aside>

            <main className="sm:pl-64 relative z-10">
                <div className="p-6 sm:p-8 lg:p-10 min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}
