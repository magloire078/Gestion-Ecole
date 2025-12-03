
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Users, 
    BookUser, 
    Wallet, 
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
];

const pedagogicalLinks = [
    { href: '/dashboard/reports', label: 'Saisie des Notes', icon: FileText },
    { href: '/dashboard/library', label: 'Bibliothèque', icon: BookOpen },
];

const financialLinks = [
  { href: '/dashboard/fees', label: 'Scolarité', icon: Wallet },
  { href: '/dashboard/accounting', label: 'Comptabilité', icon: Landmark },
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
  const { subscription } = useSubscription();

  const isProPlan = subscription?.plan === 'Pro';
  
  const isLinkActive = (links: {href: string, pro?: boolean}[]) => links.some(link => {
      if (link.pro && !isProPlan) return false;
      return pathname.startsWith(link.href)
  });

  const getDefaultOpenValues = () => {
    const openValues = [];
    if (isLinkActive(mySchoolLinks)) openValues.push('my-school');
    if (isLinkActive(administrationLinks)) openValues.push('administration');
    if (isLinkActive(pedagogicalLinks)) openValues.push('pedagogy');
    if (isLinkActive(financialLinks)) openValues.push('finance');
    return openValues;
  }

  return (
    <nav className="flex flex-col justify-between flex-1 p-2 font-medium">
      <div className='flex-1 space-y-1'>
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm font-semibold",
            pathname === '/dashboard' && "bg-muted text-primary"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />Tableau de Bord
        </Link>
        
        <Accordion type="multiple" className="w-full" defaultValue={getDefaultOpenValues()}>
          <AccordionItem value="my-school" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary">
                <div className='flex items-center gap-3'><School className="h-4 w-4" /> Mon École</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
              {mySchoolLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="administration" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary">
                <div className='flex items-center gap-3'><Briefcase className="h-4 w-4" /> Administration</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
              {administrationLinks.map(item => {
                if (item.pro && !isProPlan) return null;
                return <NavLink key={item.href} {...item} />
              })}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pedagogy" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary">
                 <div className='flex items-center gap-3'><GraduationCap className="h-4 w-4" />Pédagogie</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {pedagogicalLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="finance" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary">
                 <div className='flex items-center gap-3'><Landmark className="h-4 w-4" />Finance</div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {financialLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

       <div className='space-y-1'>
          <Link
            href="/dashboard/settings"
            className={cn(navClass, pathname.startsWith('/dashboard/settings') && !pathname.includes('subscription') && activeClass)}
            >
            <Settings className="h-4 w-4" />
            Paramètres
          </Link>
           <Link
            href="/dashboard/settings/subscription"
            className={cn(navClass, pathname === '/dashboard/settings/subscription' && activeClass)}
            >
            <CreditCard className="h-4 w-4" />
            Abonnement
          </Link>
      </div>
    </nav>
  );
}
