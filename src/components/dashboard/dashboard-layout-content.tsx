
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
import Link from 'next/link';
import { useUserSession } from '@/hooks/use-user-session';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { SearchModal } from '@/components/search-modal';
import { Home } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsPanel } from "@/components/notifications-panel";
import { useNotifications } from "@/hooks/use-notifications";
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { AnimatedHighlight } from "@/components/ui/animated-highlight";


// Ce composant récupère dynamiquement le nom d'un document pour l'afficher dans le fil d'Ariane.
function DynamicBreadcrumbItem({ prevSegment, docId }: { prevSegment: string; docId: string }) {
  const { schoolId } = useUserSession();
  const firestore = useFirestore();
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocName = async () => {
      if (!schoolId || !firestore || !prevSegment) {
        setLoading(false);
        setName('Détail');
        return;
      }

      setLoading(true);
      let collectionPath = '';
      let nameFields: string[] = [];

      switch (prevSegment) {
        case 'dossiers-eleves':
        case 'sante':
        case 'student': // Pour le portail parent
          collectionPath = `ecoles/${schoolId}/eleves`;
          nameFields = ['firstName', 'lastName'];
          break;
        case 'rh':
          collectionPath = `ecoles/${schoolId}/personnel`;
          nameFields = ['displayName'];
          break;
        case 'classes':
          collectionPath = `ecoles/${schoolId}/classes`;
          nameFields = ['name'];
          break;
        case 'competitions':
          collectionPath = `ecoles/${schoolId}/competitions`;
          nameFields = ['name'];
          break;
        default:
          setLoading(false);
          setName('Détail');
          return;
      }

      try {
        const docRef = doc(firestore, collectionPath, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const docName = nameFields.map(field => data[field]).join(' ').trim();
          setName(docName || 'Sans nom');
        } else {
          setName('Inconnu');
        }
      } catch (e) {
        console.error("Error fetching breadcrumb name:", e);
        setName('Erreur');
      } finally {
        setLoading(false);
      }
    };
    fetchDocName();
  }, [prevSegment, docId, schoolId, firestore]);

  if (loading) {
    return <Skeleton className="h-4 w-24" />;
  }

  return <span>{name || 'Détail'}</span>;
}


export default function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    schoolData,
    subscription,
    isLoading,
    isDirector,
    isSuperAdmin
  } = useUserSession();
  const { unreadCount } = useNotifications();

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

  const navProps = {
    isSuperAdmin,
    isDirector,
    userPermissions: user?.profile?.permissions || {},
    subscription,
    collapsed: isNavCollapsed,
  };

  const nameMap: { [key: string]: string } = {
    'dossiers-eleves': 'Élèves',
    'pedagogie': 'Pédagogie',
    'structure': 'Structure',
    'rh': 'RH & Paie',
    'personnel': 'Personnel',
    'bulletin': 'Bulletin',
    'fiche': 'Fiche',
    'carte': 'Carte',
    'emploi-du-temps': 'Emploi du Temps',
    'immobilier': 'Immobilier',
    'batiments': 'Bâtiments',
    'cles': 'Clés',
    'sante': 'Santé',
    'paiements': 'Paiements',
    'parametres': 'Paramètres',
    'abonnement': 'Abonnement',
    'facturation': 'Facturation',
    'donnees': 'Vérification',
    'admin': 'Administration',
    'roles': 'Rôles',
    'transport': 'Transport',
    'lignes': 'Lignes',
    'bus': 'Bus',
    'cantine': 'Cantine',
    'internat': 'Internat',
    'activites': 'Activités',
    'competitions': 'Compétitions',
    'parent': 'Portail Parent',
    'student': 'Détail Élève'
  };

  const pathSegments = pathname.split('/').filter(p => p);


  return (
    <TooltipProvider>
      <div className={cn("min-h-screen w-full bg-background print:bg-white")}>
        <aside className={cn("fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-card sm:flex print:hidden transition-all duration-300", isNavCollapsed ? "w-20" : "w-64")}>
          <div className={cn("flex items-center border-b relative overflow-hidden", isNavCollapsed ? "h-16 justify-center px-2" : "h-auto py-5 px-6")}>
            <AnimatedHighlight />
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
            "sticky top-0 z-30 flex h-auto py-4 items-center justify-between gap-4 border-b bg-card/80 dark:bg-card/80 backdrop-blur-md px-4 sm:px-6 print:hidden overflow-hidden"
          )}>
            <AnimatedHighlight />
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="outline" className="sm:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs p-0 border-none">
                  <MobileNav
                    loading={!!isLoading}
                    schoolName={schoolData?.name}
                    logoUrl={schoolData?.mainLogoUrl}
                  />
                </SheetContent>
              </Sheet>

              <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/dashboard"><Home className="h-4 w-4" /></Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {pathSegments.slice(1).map((segment, index) => {
                    const isLast = index === pathSegments.length - 2;
                    const href = `/${pathSegments.slice(0, index + 2).join('/')}`;
                    const isDynamicId = segment.length > 15 && !nameMap[segment];
                    const prevSegment = pathSegments[index];

                    return (
                      <React.Fragment key={href}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbLink
                            asChild
                            className={cn(isLast && 'text-foreground font-semibold')}
                          >
                            <Link href={href}>
                              {isDynamicId ? (
                                <DynamicBreadcrumbItem prevSegment={prevSegment} docId={segment} />
                              ) : (
                                nameMap[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                              )}
                            </Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })}
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
                    {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">{unreadCount}</Badge>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>

              <UserNav collapsed={isNavCollapsed} />
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 print:p-0 overflow-auto mesh-gradient relative">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px] pointer-events-none" />
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
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
