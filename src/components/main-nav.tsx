
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

const navClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:text-white text-sm";


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

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = pathname === href || (pathname.startsWith(href) && href !== '/dashboard');
    return (
        <Link
            href={href}
            className={cn(navClass, isActive && "text-white bg-gray-700/50")}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
};

export function MainNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { subscription } = useSubscription();
  const isAdmin = user?.customClaims?.role === 'admin';
  
  const isLinkActive = (links: {href: string}[]) => links.some(link => pathname.startsWith(link.href));

  const getDefaultOpenValues = () => {
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
         <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:text-white text-sm font-semibold",
            pathname === '/dashboard' && "bg-gray-700/80 text-white"
          )}
        >
            <LayoutDashboard className="h-4 w-4" />
            Tableau de Bord
        </Link>
        
        <Accordion type="multiple" className="w-full" defaultValue={getDefaultOpenValues()}>
          <AccordionItem value="my-school" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-white text-sm font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400", isLinkActive(mySchoolLinks) && "text-white")}>
                <div className='flex items-center gap-3'><School className="h-4 w-4" /> Mon École</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
              {mySchoolLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="administration" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-white text-sm font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400", isLinkActive(administrationLinks) && "text-white")}>
                <div className='flex items-center gap-3'><Briefcase className="h-4 w-4" /> Administration</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
              {administrationLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pedagogy" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-white text-sm font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400", isLinkActive(pedagogicalLinks) && "text-white")}>
                 <div className='flex items-center gap-3'><GraduationCap className="h-4 w-4" />Pédagogie</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {pedagogicalLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="finance" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-white text-sm font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400", isLinkActive(financialLinks) && "text-white")}>
                 <div className='flex items-center gap-3'><Wallet className="h-4 w-4" />Finance</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {financialLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="configuration" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-white text-sm font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400", isLinkActive(settingsLinks) && "text-white")}>
                 <div className='flex items-center gap-3'><FolderCog className="h-4 w-4" />Configuration</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {settingsLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
          
           {isAdmin && (
               <AccordionItem value="super-admin" className="border-b-0">
                <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-white text-sm font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400", isLinkActive(adminLinks) && "text-white")}>
                     <div className='flex items-center gap-3'><Shield className="h-4 w-4" />Super Admin</div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 pt-1 space-y-1">
                   {adminLinks.map(item => <NavLink key={item.href} {...item} />)}
                </AccordionContent>
              </AccordionItem>
           )}
        </Accordion>
      </div>
      <div className="mt-auto p-4">
        {subscription?.status === 'trialing' && (
          <Button variant="destructive" size="sm" className="w-full">
            <span className="font-bold">{user?.displayName?.charAt(0) || 'N'}</span>
            <span className="mx-2 font-semibold">Trial</span>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </nav>
  );
}
