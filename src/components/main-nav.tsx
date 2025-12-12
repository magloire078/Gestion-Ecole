"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Users, 
    Settings, 
    CalendarClock, 
    UserPlus, 
    ClipboardList,
    GraduationCap, 
    School, 
    FolderCog, 
    BookOpen,
    Briefcase,
    CreditCard,
    Send,
    Wallet,
    Landmark,
    FileText,
    UserX,
    Database,
    Shield,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUser } from '@/firebase';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const navClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:text-sidebar-foreground text-sm";
const navClassCollapsed = "justify-center rounded-lg text-sidebar-foreground/80 transition-all hover:text-sidebar-foreground";

const mySchoolLinks = [
  { href: '/dashboard/dossiers-eleves', label: 'Élèves', icon: Users },
  { href: '/dashboard/classes', label: 'Classes', icon: School },
  { href: '/dashboard/emploi-du-temps', label: 'Emploi du temps', icon: CalendarClock },
];

const administrationLinks = [
  { href: '/dashboard/inscription', label: 'Inscriptions', icon: UserPlus },
  { href: '/dashboard/rh', label: 'RH / Personnel', icon: Briefcase },
  { href: '/dashboard/messagerie', label: 'Messagerie', icon: Send },
];

const pedagogicalLinks = [
    { href: '/dashboard/notes', label: 'Saisie des Notes', icon: FileText },
    { href: '/dashboard/absences', label: 'Gestion des Absences', icon: UserX },
    { href: '/dashboard/bibliotheque', label: 'Bibliothèque', icon: BookOpen },
];

const financialLinks = [
  { href: '/dashboard/frais-scolarite', label: 'Frais de scolarité', icon: GraduationCap },
  { href: '/dashboard/paiements', label: 'Suivi des Paiements', icon: Wallet },
  { href: '/dashboard/comptabilite', label: 'Comptabilité', icon: Landmark },
];

const settingsLinks = [
  { href: '/dashboard/parametres', label: 'Paramètres généraux', icon: Settings },
  { href: '/dashboard/parametres/abonnement', label: 'Abonnement', icon: CreditCard },
  { href: '/dashboard/parametres/donnees', label: 'Données Brutes', icon: Database },
];

const adminLinks = [
    { href: '/dashboard/admin/abonnements', label: 'Abonnements', icon: CreditCard },
    { href: '/dashboard/admin/roles', label: 'Gestion des Rôles', icon: Shield },
]

const NavLink = ({ href, icon: Icon, label, collapsed }: { href: string; icon: React.ElementType; label: string, collapsed?: boolean }) => {
    const pathname = usePathname();
    const isActive = pathname === href || (pathname.startsWith(href) && href !== '/dashboard');

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={href}
                        className={cn(navClassCollapsed, "h-9 w-9", isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="sr-only">{label}</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
        );
    }
    
    return (
        <Link
            href={href}
            className={cn(navClass, isActive && "text-sidebar-accent-foreground bg-sidebar-accent")}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
};

export function MainNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { subscription } = useSubscription();
  const isAdmin = user?.customClaims?.role === 'admin';
  
  const isLinkActive = (links: {href: string}[]) => links.some(link => pathname.startsWith(link.href));

  const getDefaultOpenValues = () => {
    if (collapsed) return [];
    if (pathname === '/dashboard') return [];
    const openValues = [];
    if (isLinkActive(mySchoolLinks)) openValues.push('my-school');
    if (isLinkActive(administrationLinks)) openValues.push('administration');
    if (isLinkActive(pedagogicalLinks)) openValues.push('pedagogy');
    if (isLinkActive(financialLinks)) openValues.push('finance');
    if (isLinkActive(settingsLinks)) openValues.push('configuration');
    if (isAdmin && isLinkActive(adminLinks)) openValues.push('super-admin');
    return openValues;
  }

  return (
    <nav className="flex flex-col flex-1 p-2">
      <div className='flex-1 space-y-1'>
         <NavLink href="/dashboard" icon={LayoutDashboard} label="Tableau de Bord" collapsed={collapsed} />
        
        {collapsed ? (
            <div className="space-y-2 mt-4">
                {mySchoolLinks.map(item => <NavLink key={item.href} {...item} collapsed />)}
                 <hr className="my-2 border-sidebar-border" />
                {administrationLinks.map(item => <NavLink key={item.href} {...item} collapsed />)}
                 <hr className="my-2 border-sidebar-border" />
                {pedagogicalLinks.map(item => <NavLink key={item.href} {...item} collapsed />)}
            </div>
        ) : (
            <Accordion type="multiple" className="w-full" defaultValue={getDefaultOpenValues()}>
              <AccordionItem value="my-school" className="border-b-0">
                <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-sidebar-foreground text-sm font-semibold text-sidebar-foreground/70 [&[data-state=open]>svg]:text-blue-400", isLinkActive(mySchoolLinks) && "text-sidebar-foreground")}>
                    <div className='flex items-center gap-3'><School className="h-4 w-4" /> Mon École</div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 pt-1 space-y-1">
                  {mySchoolLinks.map(item => <NavLink key={item.href} {...item} />)}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="administration" className="border-b-0">
                <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-sidebar-foreground text-sm font-semibold text-sidebar-foreground/70 [&[data-state=open]>svg]:text-blue-400", isLinkActive(administrationLinks) && "text-sidebar-foreground")}>
                    <div className='flex items-center gap-3'><Briefcase className="h-4 w-4" /> Administration</div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 pt-1 space-y-1">
                  {administrationLinks.map(item => <NavLink key={item.href} {...item} />)}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pedagogy" className="border-b-0">
                <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-sidebar-foreground text-sm font-semibold text-sidebar-foreground/70 [&[data-state=open]>svg]:text-blue-400", isLinkActive(pedagogicalLinks) && "text-sidebar-foreground")}>
                     <div className='flex items-center gap-3'><GraduationCap className="h-4 w-4" />Pédagogie</div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 pt-1 space-y-1">
                   {pedagogicalLinks.map(item => <NavLink key={item.href} {...item} />)}
                </AccordionContent>
              </AccordionItem>
              
               <AccordionItem value="finance" className="border-b-0">
                <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-sidebar-foreground text-sm font-semibold text-sidebar-foreground/70 [&[data-state=open]>svg]:text-blue-400", isLinkActive(financialLinks) && "text-sidebar-foreground")}>
                     <div className='flex items-center gap-3'><Wallet className="h-4 w-4" />Finance</div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 pt-1 space-y-1">
                   {financialLinks.map(item => <NavLink key={item.href} {...item} />)}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="configuration" className="border-b-0">
                <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-sidebar-foreground text-sm font-semibold text-sidebar-foreground/70 [&[data-state=open]>svg]:text-blue-400", isLinkActive(settingsLinks) && "text-sidebar-foreground")}>
                     <div className='flex items-center gap-3'><FolderCog className="h-4 w-4" />Configuration</div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 pt-1 space-y-1">
                   {settingsLinks.map(item => <NavLink key={item.href} {...item} />)}
                </AccordionContent>
              </AccordionItem>
              
               {isAdmin && (
                   <AccordionItem value="super-admin" className="border-b-0">
                    <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-sidebar-foreground text-sm font-semibold text-sidebar-foreground/70 [&[data-state=open]>svg]:text-blue-400", isLinkActive(adminLinks) && "text-sidebar-foreground")}>
                         <div className='flex items-center gap-3'><Shield className="h-4 w-4" />Super Admin</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-4 pt-1 space-y-1">
                       {adminLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                  </AccordionItem>
               )}
            </Accordion>
        )}
      </div>
    </nav>
  );
}
