
'use client';
import * as React from "react";
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell, Menu, Search } from 'lucide-react';
import { MobileNav } from '@/components/mobile-nav';
import { AuthGuard } from '@/components/auth-guard';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { SearchModal } from '@/components/search-modal';
import { NotificationsPanel } from '@/components/notifications-panel';
import { Home } from 'lucide-react';


function DashboardContent({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K pour la recherche
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
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
      <TooltipProvider>
        <div className={cn("min-h-screen w-full bg-muted/40 print:bg-white")}>
          <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex print:hidden">
            <div className="flex h-16 shrink-0 items-center border-b px-6">
              <Logo />
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <MainNav collapsed={false} />
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex flex-col sm:pl-60">
            
            {/* Header */}
            <header className={cn(
              "sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 dark:bg-background/80 backdrop-blur-md px-4 sm:px-6 print:hidden"
            )}>
              
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-xs p-0 bg-background text-foreground border-r-0">
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

              <div className="flex items-center gap-2">
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsSearchOpen(true)}
                    >
                      <Search className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rechercher (⌘K)</TooltipContent>
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
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: userLoading } = useUser();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (userLoading || schoolLoading) {
      return; // Ne rien faire pendant le chargement
    }

    const isOnboardingPage = pathname.startsWith('/dashboard/onboarding');

    if (!user) {
      // Si l'utilisateur n'est pas connecté, redirigez-le vers la page de connexion
      router.replace('/login');
      return;
    }

    if (!schoolId && !isOnboardingPage) {
      // Si l'utilisateur est connecté mais n'a pas d'école ET n'est pas sur la page d'intégration,
      // redirigez-le vers la page d'intégration.
      router.replace('/dashboard/onboarding');
      return;
    }
    
    if (schoolId && isOnboardingPage) {
      // Si l'utilisateur a une école mais est sur la page d'intégration,
      // redirigez-le vers le tableau de bord principal.
      router.replace('/dashboard');
      return;
    }

  }, [user, schoolId, userLoading, schoolLoading, pathname, router]);

  // AuthGuard gère l'état de chargement initial.
  return (
    <AuthGuard>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  );
}
