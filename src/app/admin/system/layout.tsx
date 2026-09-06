
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import {
    ShieldCheck,
    BarChart3,
    Building,
    Users,
    Home,
    Settings,
    Scroll,
    LogOut,
    Palette,
    LifeBuoy,
    CalendarClock,
    FileText,
    HeartPulse,
    Inbox,
    ListTodo,
    Target,
    TrendingUp,
    Menu,
    UploadCloud,
    MessageSquare,
    Megaphone,
    Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/logo';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const adminNavLinks = [
    { href: '/admin/system/dashboard', label: 'Vue d\'ensemble', icon: BarChart3 },
    { href: '/admin/system/schools', label: 'Écoles', icon: Building },
    { href: '/admin/system/subscriptions', label: 'Abonnements', icon: CalendarClock },
    { href: '/admin/system/decisions', label: 'Boîte de décisions', icon: Inbox },
    { href: '/admin/system/actions', label: 'Actions du jour', icon: ListTodo },
    { href: '/admin/system/health', label: 'Suivi clients', icon: HeartPulse },
    { href: '/admin/system/prospects', label: 'Prospects', icon: Target },
    { href: '/admin/system/kpis', label: 'KPIs commerciaux', icon: TrendingUp },
    { href: '/admin/system/admins', label: 'Administrateurs', icon: Users },
    { href: '/admin/system/import', label: 'Import (assistance)', icon: UploadCloud },
    { href: '/admin/system/messages', label: 'Messagerie écoles', icon: MessageSquare },
    { href: '/admin/system/announcements', label: 'Annonces plateforme', icon: Megaphone },
    { href: '/admin/system/campaigns', label: 'Campagnes', icon: Send },
    { href: '/admin/system/formulaires', label: 'Formulaires', icon: FileText },
    { href: '/admin/system/audit-log', label: 'Journaux d\'Audit', icon: Scroll },
    { href: '/admin/system/support', label: 'Support Système', icon: LifeBuoy },
    { href: '/admin/system/settings', label: 'Paramètres', icon: Settings },
];

const themes = [
    { 
        id: 'aura', name: 'Aura', class: '', 
        primary: '#2D9CDB', dark: '#0C365A',
        bgPrimary: 'bg-[#2D9CDB]', bgDark: 'bg-[#0C365A]', textDark: 'text-[#0C365A]' 
    },
    { 
        id: 'midnight', name: 'Midnight', class: 'theme-midnight dark', 
        primary: '#D4AF37', dark: '#1A1A1A',
        bgPrimary: 'bg-[#D4AF37]', bgDark: 'bg-[#1A1A1A]', textDark: 'text-[#1A1A1A]' 
    },
    { 
        id: 'emerald', name: 'Emerald', class: 'theme-emerald', 
        primary: '#10B981', dark: '#064E3B',
        bgPrimary: 'bg-[#10B981]', bgDark: 'bg-[#064E3B]', textDark: 'text-[#064E3B]' 
    },
    { 
        id: 'cyber', name: 'Cyber', class: 'theme-cyber dark', 
        primary: '#F472B6', dark: '#2E1065',
        bgPrimary: 'bg-[#F472B6]', bgDark: 'bg-[#2E1065]', textDark: 'text-[#2E1065]' 
    },
];

export default function SystemAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const [activeTheme, setActiveTheme] = useState(themes[0]);
    const [showThemePicker, setShowThemePicker] = useState(false);

    // Un accès "commercial" est restreint au pipeline prospects : pas de
    // vue d'ensemble, abonnements, autres écoles, etc. Un super-admin voit
    // tout comme avant.
    const isCommercialOnly = !!user?.profile?.isCommercial && !user?.profile?.isAdmin;
    const visibleNavLinks = isCommercialOnly
        ? adminNavLinks.filter(link => link.href === '/admin/system/prospects')
        : adminNavLinks;

    useEffect(() => {
        if (isCommercialOnly && pathname !== '/admin/system/prospects') {
            router.replace('/admin/system/prospects');
        }
    }, [isCommercialOnly, pathname, router]);

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

    const SidebarContent = () => (
        <>
            <div className="flex h-20 shrink-0 items-center border-b px-6 relative overflow-hidden group border-[hsl(var(--admin-sidebar-border))]">
                <AnimatedHighlight />
                <div className={cn("flex items-center gap-3 font-black text-xl tracking-tight font-outfit", activeTheme.textDark)}>
                    <div
                        className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110", activeTheme.bgDark)}
                    >
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <span className="dark:text-white">SYS ADMIN</span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 mt-4">
                {visibleNavLinks.map(link => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "group flex items-center gap-x-3 rounded-xl p-3 text-sm font-bold transition-all duration-300",
                                isActive
                                    ? cn("text-white shadow-xl", activeTheme.bgDark)
                                    : "text-slate-400 hover:bg-blue-50/50 hover:text-[hsl(var(--admin-primary))] dark:hover:bg-white/5"
                            )}
                            onClick={() => setShowThemePicker(false)} // close theme picker if open
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
                                    className={cn("ml-auto w-1.5 h-1.5 rounded-full", activeTheme.bgPrimary)}
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
                        className="w-full flex items-center justify-start gap-3 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"
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
                                className="absolute bottom-full left-0 w-full mb-2 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-blue-50/50 dark:border-white/10 z-50 overflow-hidden"
                            >
                                <div className="grid grid-cols-4 gap-2">
                                    {themes.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => changeTheme(t)}
                                            className={cn(
                                                "h-10 rounded-xl transition-all border-2",
                                                activeTheme.id === t.id ? "border-[hsl(var(--admin-primary))]" : "border-transparent",
                                                t.bgDark
                                            )}
                                            title={t.name}
                                        >
                                            <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                                <div className={cn("w-3 h-3 rounded-full", t.bgPrimary)} />
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
                    className="group flex items-center gap-x-3 rounded-xl p-3 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-[hsl(var(--admin-primary-dark))] transition-all dark:hover:bg-white/5"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 group-hover:bg-slate-100 dark:group-hover:bg-white/10">
                        <Home className="h-5 w-5" />
                    </div>
                    <span>Quitter l'Admin</span>
                </Link>
            </div>
        </>
    );

    return (
        <div className={cn("min-h-screen w-full font-sans transition-colors duration-500", activeTheme.class, activeTheme.id === 'aura' ? 'bg-[#f8faff]' : 'bg-[hsl(var(--admin-bg))]')}>
            {/* Decorative background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className={cn("absolute top-0 right-0 w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 transition-colors duration-1000", activeTheme.bgPrimary)}
                />
                <div
                    className={cn("absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 transition-colors duration-1000", activeTheme.bgDark)}
                />
            </div>

            {/* Mobile Header */}
            <div className="sm:hidden flex items-center justify-between p-4 border-b bg-white/70 backdrop-blur-xl dark:bg-black/40 border-[hsl(var(--admin-sidebar-border))] sticky top-0 z-30">
                <div className={cn("flex items-center gap-2 font-black text-lg tracking-tight font-outfit", activeTheme.textDark)}>
                    <ShieldCheck className="h-5 w-5" />
                    <span>SYS ADMIN</span>
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0 bg-white/95 dark:bg-black/90 backdrop-blur-xl border-r border-[hsl(var(--admin-sidebar-border))] flex flex-col">
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
            </div>

            <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-white/70 backdrop-blur-xl sm:flex shadow-[20px_0_50px_rgba(0,0,0,0.02)] transition-all duration-300 dark:bg-black/40 border-[hsl(var(--admin-sidebar-border))]">
                <SidebarContent />
            </aside>

            <main className="sm:pl-64 relative z-10 transition-colors duration-500">
                <div className="p-6 sm:p-4 md:p-6 lg:p-10 min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}


