"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Users, 
    BookUser, 
    Settings, 
    CalendarClock, 
    FileText, 
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const mySchoolLinks = [
  { href: '/dashboard/eleves', label: 'Élèves', icon: Users },
  { href: '/dashboard/classes', label: 'Classes', icon: School },
  { href: '/dashboard/enseignants', label: 'Professeurs', icon: BookUser },
  { href: '/dashboard/emploi-du-temps', label: 'Emploi du temps', icon: CalendarClock },
];

const administrationLinks = [
  { href: '/dashboard/inscription', label: 'Inscriptions', icon: UserPlus },
  { href: '/dashboard/rh', label: 'RH / Personnel', icon: ClipboardList },
  { href: '/dashboard/messagerie', label: 'Messagerie', icon: Send },
];

const pedagogicalLinks = [
    { href: '/dashboard/notes', label: 'Saisie des Notes', icon: FileText },
    { href: '/dashboard/bibliotheque', label: 'Bibliothèque', icon: BookOpen },
];

const financialLinks = [
  { href: '/dashboard/scolarite', label: 'Scolarité', icon: Wallet },
  { href: '/dashboard/comptabilite', label: 'Comptabilité', icon: Landmark },
];

const settingsLinks = [
  { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
  { href: '/dashboard/parametres/abonnement', label: 'Abonnement', icon: CreditCard },
];

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
    return (
        <Link
            href={href}
            className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground", isActive && "text-foreground font-semibold")}
        >
            <Icon className="h-5 w-5" />
            {label}
        </Link>
    );
};


export function MobileNav() {
  const pathname = usePathname();
  
  const isLinkActive = (links: {href: string}[]) => links.some(link => pathname.startsWith(link.href));

  const getDefaultOpenValues = () => {
    const openValues = [];
    if (isLinkActive(mySchoolLinks)) openValues.push('my-school');
    if (isLinkActive(administrationLinks)) openValues.push('administration');
    if (isLinkActive(pedagogicalLinks)) openValues.push('pedagogy');
    if (isLinkActive(financialLinks)) openValues.push('finance');
    if (isLinkActive(settingsLinks)) openValues.push('configuration');
    return openValues;
  }

  return (
    <div className='flex flex-col h-full'>
        <div className="flex h-[60px] items-center p-6 border-b">
            <Logo />
        </div>
        <nav className="grid gap-2 text-lg font-medium p-6 flex-1 overflow-y-auto">
            <Link
                href="/dashboard"
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary font-semibold", pathname === '/dashboard' && "text-primary bg-muted")}
            >
                <LayoutDashboard className="h-5 w-5" />
                Tableau de Bord
            </Link>

             <Accordion type="multiple" className="w-full" defaultValue={getDefaultOpenValues()}>
                <AccordionItem value="my-school" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-foreground text-lg font-semibold text-muted-foreground [&[data-state=open]>svg]:text-foreground">
                       <div className='flex items-center gap-3'><School className="h-5 w-5" />Mon École</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {mySchoolLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="administration" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-foreground text-lg font-semibold text-muted-foreground [&[data-state=open]>svg]:text-foreground">
                       <div className='flex items-center gap-3'><Briefcase className="h-5 w-5" />Administration</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {administrationLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>
             
                <AccordionItem value="pedagogy" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-foreground text-lg font-semibold text-muted-foreground [&[data-state=open]>svg]:text-foreground">
                        <div className='flex items-center gap-3'><GraduationCap className="h-5 w-5" />Pédagogie</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {pedagogicalLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="finance" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-foreground text-lg font-semibold text-muted-foreground [&[data-state=open]>svg]:text-foreground">
                        <div className='flex items-center gap-3'><Wallet className="h-5 w-5" />Finance</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {financialLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="configuration" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-foreground text-lg font-semibold text-muted-foreground [&[data-state=open]>svg]:text-foreground">
                        <div className='flex items-center gap-3'><FolderCog className="h-5 w-5" />Configuration</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {settingsLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </nav>
    </div>
  );
}
