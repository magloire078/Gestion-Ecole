
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Users, 
    Settings, 
    CalendarClock, 
    UserPlus, 
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUser } from '@/firebase';

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
            className={cn("flex items-center gap-4 px-2.5 text-gray-300 hover:text-white", isActive && "text-white font-semibold")}
        >
            <Icon className="h-5 w-5" />
            {label}
        </Link>
    );
};


export function MobileNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const isAdmin = user?.customClaims?.role === 'admin';
  
  const isLinkActive = (links: {href: string}[]) => links.some(link => pathname.startsWith(link.href));

  const getDefaultOpenValues = () => {
    const openValues = [];
    if (pathname === '/dashboard') return [];
    if (isLinkActive(mySchoolLinks)) openValues.push('my-school');
    if (isLinkActive(administrationLinks)) openValues.push('administration');
    if (isLinkActive(pedagogicalLinks)) openValues.push('pedagogy');
    if (isLinkActive(financialLinks)) openValues.push('finance');
    if (isLinkActive(settingsLinks)) openValues.push('configuration');
    if (isAdmin && isLinkActive(adminLinks)) openValues.push('super-admin');
    return openValues;
  }

  return (
    <div className='flex flex-col h-full'>
        <div className="flex h-[60px] items-center p-6 border-b border-gray-700">
            <Logo />
        </div>
        <nav className="grid gap-2 text-lg font-medium p-4 flex-1 overflow-y-auto">
            <Link
                href="/dashboard"
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:text-white font-semibold", pathname === '/dashboard' && "text-white bg-gray-700/80")}
            >
                <LayoutDashboard className="h-5 w-5" />
                Tableau de Bord
            </Link>

             <Accordion type="multiple" className="w-full" defaultValue={getDefaultOpenValues()}>
                <AccordionItem value="my-school" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-white text-lg font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400">
                       <div className='flex items-center gap-3'><School className="h-5 w-5" />Mon École</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {mySchoolLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="administration" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-white text-lg font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400">
                       <div className='flex items-center gap-3'><Briefcase className="h-5 w-5" />Administration</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {administrationLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>
             
                <AccordionItem value="pedagogy" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-white text-lg font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400">
                        <div className='flex items-center gap-3'><GraduationCap className="h-5 w-5" />Pédagogie</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {pedagogicalLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="finance" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-white text-lg font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400">
                        <div className='flex items-center gap-3'><Wallet className="h-5 w-5" />Finance</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {financialLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="configuration" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-white text-lg font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400">
                        <div className='flex items-center gap-3'><FolderCog className="h-5 w-5" />Configuration</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {settingsLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>

                {isAdmin && (
                    <AccordionItem value="super-admin" className="border-b-0">
                        <AccordionTrigger className="py-2 hover:no-underline hover:text-white text-lg font-semibold text-gray-400 [&[data-state=open]>svg]:text-blue-400">
                           <div className='flex items-center gap-3'><Shield className="h-5 w-5" />Super Admin</div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-6 pt-2 space-y-4">
                           {adminLinks.map(item => <NavLink key={item.href} {...item} />)}
                        </AccordionContent>
                    </AccordionItem>
                )}
            </Accordion>
        </nav>
    </div>
  );
}
