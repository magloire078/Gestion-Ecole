
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    ShieldCheck,
    BarChart3,
    Building,
    Users,
    Home,
    Settings,
    Scroll,
    LogOut,
    Palette
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const adminNavLinks = [
    { href: '/admin/system/dashboard', label: 'Vue d\'ensemble', icon: BarChart3 },
    { href: '/admin/system/schools', label: 'Écoles', icon: Building },
    { href: '/admin/system/admins', label: 'Administrateurs', icon: Users },
    { href: '/admin/system/audit-log', label: 'Journaux d\'Audit', icon: Scroll },
    { href: '/admin/system/settings', label: 'Paramètres', icon: Settings },
];

const themes = [
    { id: 'aura', name: 'Aura', class: '', primary: '#2D9CDB', dark: '#0C365A' },
    { id: 'midnight', name: 'Midnight', class: 'theme-midnight dark', primary: '#D4AF37', dark: '#1A1A1A' },
    { id: 'emerald', name: 'Emerald', class: 'theme-emerald', primary: '#10B981', dark: '#064E3B' },
    { id: 'cyber', name: 'Cyber', class: 'theme-cyber dark', primary: '#F472B6', dark: '#2E1065' },
];

export default function SystemAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [activeTheme, setActiveTheme] = useState(themes[0]);
    const [showThemePicker, setShowThemePicker] = useState(false);

    useEffect(() => {
        const savedThemeId = localStorage.getItem('admin-theme');
        if (savedThemeId) {
            const theme = themes.find(t => t.id === savedThemeId);
            if (theme) setActiveTheme(theme);
        }
    }, []);

    const changeTheme = (theme: typeof themes[0]) => {
        setActiveTheme(theme);
        localStorage.setItem('admin-theme', theme.id);
        setShowThemePicker(false);
    };

    return (
        <div className={cn("min-h-screen w-full font-sans transition-colors duration-500", activeTheme.class, activeTheme.id === 'aura' ? 'bg-[#f8faff]' : 'bg-[hsl(var(--admin-bg))]')}>
            {/* Decorative background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 transition-colors duration-1000"
                    style={{ backgroundColor: activeTheme.primary }}
                />
                <div
                    className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 transition-colors duration-1000"
                    style={{ backgroundColor: activeTheme.dark }}
                />
            </div>

            <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-white/70 backdrop-blur-xl sm:flex shadow-[20px_0_50px_rgba(0,0,0,0.02)] transition-all duration-300 dark:bg-black/40 border-[hsl(var(--admin-sidebar-border))]">
                <div className="flex h-20 shrink-0 items-center border-b px-6 relative overflow-hidden group border-[hsl(var(--admin-sidebar-border))]">
                    <AnimatedHighlight />
                    <div className="flex items-center gap-3 font-black text-xl tracking-tight font-outfit" style={{ color: activeTheme.dark }}>
                        <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110"
                            style={{ backgroundColor: activeTheme.dark, shadowColor: `${activeTheme.dark}33` }}
                        >
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <span className="dark:text-white">SYS ADMIN</span>
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
                                        ? "text-white shadow-xl"
                                        : "text-slate-400 hover:bg-blue-50/50 hover:text-[hsl(var(--admin-primary))] dark:hover:bg-white/5"
                                )}
                                style={isActive ? { backgroundColor: activeTheme.dark } : {}}
                            >
                                <div className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                                    isActive ? "bg-white/10" : "bg-slate-50 dark:bg-white/5 group-hover:bg-blue-100/50 dark:group-hover:bg-white/10"
                                )}>
                                    <link.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400 group-hover:text-[hsl(var(--admin-primary))]")} />
                                </div>
                                <span className={cn(isActive ? "text-white" : "dark:text-slate-400 dark:group-hover:text-white")}>{link.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="ml-auto w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: activeTheme.primary }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto border-t p-4 space-y-2 border-[hsl(var(--admin-sidebar-border))]">
                    <div className="relative">
                        <Button
                            variant="ghost"
                            className="w-full flex items-center justify-start gap-3 h-12 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
                            onClick={() => setShowThemePicker(!showThemePicker)}
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5">
                                <Palette className="h-5 w-5" />
                            </div>
                            <span>Thèmes</span>
                        </Button>

                        <AnimatePresence>
                            {showThemePicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full left-0 w-full mb-2 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-blue-50/50 dark:border-white/10 z-50 overflow-hidden"
                                >
                                    <div className="grid grid-cols-4 gap-2">
                                        {themes.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => changeTheme(t)}
                                                className={cn(
                                                    "h-10 rounded-xl transition-all border-2",
                                                    activeTheme.id === t.id ? "border-[hsl(var(--admin-primary))]" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: t.dark }}
                                                title={t.name}
                                            >
                                                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.primary }} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Link
                        href="/dashboard"
                        className="group flex items-center gap-x-3 rounded-2xl p-3 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-[hsl(var(--admin-primary-dark))] transition-all dark:hover:bg-white/5"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 group-hover:bg-slate-100 dark:group-hover:bg-white/10">
                            <Home className="h-5 w-5" />
                        </div>
                        <span>Quitter l'Admin</span>
                    </Link>
                </div>
            </aside>

            <main className="sm:pl-64 relative z-10 transition-colors duration-500">
                <div className="p-6 sm:p-8 lg:p-10 min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}

import { Button } from '@/components/ui/button';
