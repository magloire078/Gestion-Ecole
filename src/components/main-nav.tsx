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
    Landmark, 
    UserPlus, 
    ClipboardUser,
    GraduationCap, 
    School, 
    FolderCog, 
    BookOpen,
    Briefcase,
    CreditCard,
    Send,
    Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSubscription } from '@/hooks/use-subscription';


const navClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm";
const activeClass = "bg-muted text-primary";

const mySchoolLinks = [
  { href: '/dashboard/students', label: 'Élèves', icon: Users },
  { href: '/dashboard/classes', label: 'Classes', icon: Landmark },
  { href: '/dashboard/teachers', label: 'Professeurs', icon: BookUser },
  { href: '/dashboard/timetable', label: 'Emploi du temps', icon: CalendarClock },
];

const administrationLinks = [
  { href: '/dashboard/registration', label: 'Inscriptions', icon: UserPlus },
  { href: '/dashboard/hr', label: 'RH / Personnel', icon: ClipboardUser, pro: true },
  { href: '/dashboard/messaging', label: 'Messagerie', icon: Send },
];

const pedagogicalLinks = [
    { href: '/dashboard/reports', label: 'Saisie des Notes', icon: FileText },
    { href: '/dashboard/library', label: 'Bibliothèque', icon: BookOpen },
];

const financialLinks = [
  { href: '/dashboard/fees', label: 'Scolarité', icon: Wallet },
  { href: '/dashboard/accounting', label: 'Comptabilité', icon: Landmark },
];

const settingsLinks = [
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
  { href: '/dashboard/settings/subscription', label: 'Abonnement', icon: CreditCard },
];

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
    return (
        <Link
            href={href}
            className={cn(navClass, isActive && activeClass)}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
};

export function MainNav() {
  const pathname = usePathname();
  
  const isLinkActive = (links: {href: string}[]) => links.some(link => pathname.startsWith(link.href));

  const getDefaultOpenValues = () => {
    const openValues = [];
    if (pathname === '/dashboard') return [];
    if (isLinkActive(mySchoolLinks)) openValues.push('my-school');
    if (isLinkActive(administrationLinks)) openValues.push('administration');
    if (isLinkActive(pedagogicalLinks)) openValues.push('pedagogy');
    if (isLinkActive(financialLinks)) openValues.push('finance');
    if (isLinkActive(settingsLinks)) openValues.push('configuration');
    return openValues;
  }

  return (
    <nav className="flex flex-col flex-1 p-2 font-medium">
      <div className='flex-1 space-y-1'>
         <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm font-semibold",
            pathname === '/dashboard' && "bg-muted text-primary"
          )}
        >
            <LayoutDashboard className="h-4 w-4" />
            Tableau de Bord
        </Link>
        
        <Accordion type="multiple" className="w-full" defaultValue={getDefaultOpenValues()}>
          <AccordionItem value="my-school" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary", isLinkActive(mySchoolLinks) && "text-primary")}>
                <div className='flex items-center gap-3'><School className="h-4 w-4" /> Mon École</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
              {mySchoolLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="administration" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary", isLinkActive(administrationLinks) && "text-primary")}>
                <div className='flex items-center gap-3'><Briefcase className="h-4 w-4" /> Administration</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
              {administrationLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pedagogy" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary", isLinkActive(pedagogicalLinks) && "text-primary")}>
                 <div className='flex items-center gap-3'><GraduationCap className="h-4 w-4" />Pédagogie</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {pedagogicalLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="finance" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary", isLinkActive(financialLinks) && "text-primary")}>
                 <div className='flex items-center gap-3'><Landmark className="h-4 w-4" />Finance</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {financialLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="configuration" className="border-b-0">
            <AccordionTrigger className={cn("py-2 px-3 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary", isLinkActive(settingsLinks) && "text-primary")}>
                 <div className='flex items-center gap-3'><FolderCog className="h-4 w-4" />Configuration</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {settingsLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </nav>
  );
}
