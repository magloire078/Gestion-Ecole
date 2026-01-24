'use client';
import * as React from "react";
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell, Menu, Search, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { MobileNav } from '@/components/mobile-nav';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useSchoolData } from '@/hooks/use-school-data';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { SearchModal } from '@/components/search-modal';
import { NotificationsPanel } from '@/components/notifications-panel';
import { Home } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";


export default function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: userLoading, isDirector } = useUser();
  const { schoolData, subscription, loading: schoolLoading } = useSchoolData();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  
  const navProps = {
    isSuperAdmin: user?.profile?.isAdmin === true,
    isDirector: isDirector,
    userPermissions: user?.profile?.permissions || {},
    subscription: subscription,
    collapsed: isNavCollapsed,
  };

  const isLoading = userLoading || (user && !user.isParent && schoolLoading) || (user && !user.isParent && !schoolData);


  return (
      <TooltipProvider>
        <div className={cn("min-h-screen w-full bg-background print:bg-white")}>
          <aside className={cn("fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-card sm:flex print:hidden transition-all duration-300", isNavCollapsed ? "w-20" : "w-64")}>
            <div className={cn("flex h-16 shrink-0 items-center border-b px-6", isNavCollapsed && "justify-center px-2")}>
              {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className={cn("rounded-lg h-10 w-10")} />
                    {!isNavCollapsed && <Skeleton className="h-5 w-32" />}
                  </div>
              ) : (
                  <Logo 
                    compact={isNavCollapsed} 
                    schoolName={schoolData?.name}
                    logoUrl={schoolData?.mainLogoUrl}
                  />
              )}
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                  <div className="space-y-2 p-2">
                      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
              ) : (
                  <MainNav {...navProps} />
              )}
            </nav>
             <div className="mt-auto flex flex-col p-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" className="self-center" onClick={() => setIsNavCollapsed(!isNavCollapsed)}>
                        {isNavCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {isNavCollapsed ? "Étendre" : "Réduire"}
                  </TooltipContent>
                </Tooltip>
            </div>
          </aside>

          <div className={cn("flex flex-col transition-all duration-300", isNavCollapsed ? "sm:pl-20" : "sm:pl-64")}>
            
            <header className={cn(
              "sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card/80 dark:bg-card/80 backdrop-blur-md px-4 sm:px-6 print:hidden"
            )}>
              
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-xs p-0 bg-card text-card-foreground border-r-0">
                    <MobileNav 
                      loading={isLoading}
                      schoolName={schoolData?.name}
                      logoUrl={schoolData?.mainLogoUrl}
                    />
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
                     </Button>
                   </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
                <UserNav collapsed={isNavCollapsed} />
              </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 print:p-0 overflow-auto bg-muted/40">
                {children}
            </main>

          </div>

          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
          />

          <NotificationsPanel
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
          />
        </div>
      </TooltipProvider>
  )
}
