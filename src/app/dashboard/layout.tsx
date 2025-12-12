
'use client';
import * as React from "react";
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell, Menu, Search, X, Home, Settings, LogOut, Moon, Sun, ChevronLeft, ChevronRight, HelpCircle, Download } from 'lucide-react';
import { MobileNav } from '@/components/mobile-nav';
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/components/auth-guard';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { SearchModal } from '@/components/search-modal';
import { NotificationsPanel } from '@/components/notifications-panel';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();

  // Mock notifications - à remplacer par votre logique
  useEffect(() => {
    // Simuler des notifications
    const mockUnread = Math.floor(Math.random() * 10);
    setUnreadNotifications(mockUnread);
  }, []);

  // Détecter le scroll pour l'effet de header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K pour la recherche
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Cmd/Ctrl + / pour basculer la sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
      // Échap pour fermer les modals
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Générer le breadcrumb dynamiquement
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(path => path && path !== 'dashboard');
    const breadcrumbs = [];
    
    let currentPath = '/dashboard';
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      currentPath += `/${path}`;
      
      const formattedName = path
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      breadcrumbs.push({
        name: formattedName,
        href: currentPath,
        isCurrent: i === paths.length - 1
      });
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleSearch = useCallback((query: string) => {
    console.log('Recherche:', query);
    // Implémentez votre logique de recherche ici
    // router.push(`/dashboard/recherche?q=${encodeURIComponent(query)}`);
    setIsSearchOpen(false);
  }, [router]);

  return (
    <AuthGuard>
      <TooltipProvider>
        <div className={cn("flex min-h-screen w-full flex-col bg-muted/40 print:bg-white")}>
          
          {/* Sidebar Desktop */}
          <aside className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-gray-900 text-white shadow-xl transition-all duration-300 ease-in-out sm:flex print:hidden",
            isSidebarCollapsed ? "w-20" : "w-64"
          )}>
            
            {/* Logo et toggle */}
            <div className="flex h-16 items-center justify-between border-b border-gray-700/50 px-4">
              {!isSidebarCollapsed && <Logo />}
              {isSidebarCollapsed && (
                <div className="mx-auto">
                  <Logo compact />
                </div>
              )}
               <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-4 top-6 z-50 h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSidebarCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isSidebarCollapsed ? 'Étendre' : 'Réduire'}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-2">
              <MainNav collapsed={isSidebarCollapsed} />
            </div>

          </aside>

          {/* Main content */}
          <div className={cn(
            "flex flex-col transition-all duration-300 ease-in-out",
            isSidebarCollapsed ? "sm:pl-20" : "sm:pl-64"
          )}>
            
            {/* Header */}
            <header className={cn(
              "sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b bg-background/80 dark:bg-background/80 backdrop-blur-md transition-shadow px-4 sm:px-6 print:hidden",
              isScrolled && "shadow-sm"
            )}>
              
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-xs p-0 bg-gray-900 text-white border-r-0">
                    <MobileNav />
                  </SheetContent>
                </Sheet>

                <Breadcrumb className="hidden md:flex">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard" className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Dashboard
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.length > 0 && <BreadcrumbSeparator />}
                    {breadcrumbs.map((crumb, index) => (
                      <React.Fragment key={crumb.href}>
                        <BreadcrumbItem>
                          <BreadcrumbLink 
                            href={crumb.href}
                            className={cn(
                              "transition-colors hover:text-primary",
                              crumb.isCurrent && "text-foreground font-semibold"
                            )}
                          >
                            {crumb.name}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        {!crumb.isCurrent && <BreadcrumbSeparator />}
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="flex-1 max-w-sm mx-4 hidden lg:block">
                <Button
                    variant="outline"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher...
                    <kbd className="ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                      <span className="text-lg">⌘</span>K
                    </kbd>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden sm:inline-flex">
                      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" onClick={() => setIsNotificationsOpen(true)}>
                      <Bell className="h-5 w-5" />
                      {unreadNotifications > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-5 w-5 min-w-0 p-0 flex items-center justify-center text-xs"
                        >
                          {unreadNotifications > 9 ? '9+' : unreadNotifications}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>

                <UserNav />
              </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 print:p-0 overflow-auto">
                {children}
            </main>

          </div>

          {/* Modals */}
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSearch={handleSearch}
          />

          <NotificationsPanel
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            notifications={[]}
          />
        </div>
      </TooltipProvider>
    </AuthGuard>
  );
}
