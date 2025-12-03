
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
    School, 
    FolderCog, 
    GraduationCap, 
    BookOpen,
    Briefcase,
    CreditCard,
    Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useSubscription } from '@/hooks/use-subscription';


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
                        {administrationLinks.map(item => {
                          if (item.pro && !isProPlan) return null;
                          return <NavLink key={item.href} {...item} />
                        })}
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
                        <div className='flex items-center gap-3'><Landmark className="h-5 w-5" />Finance</div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {financialLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
             <Link
                href="/dashboard/settings"
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary font-semibold", pathname.startsWith('/dashboard/settings') && !pathname.includes('subscription') && "text-primary bg-muted")}
            >
                <Settings className="h-5 w-5" />
                Paramètres
            </Link>
             <Link
                href="/dashboard/settings/subscription"
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary font-semibold", pathname === '/dashboard/settings/subscription' && "text-primary bg-muted")}
            >
                <CreditCard className="h-5 w-5" />
                Abonnement
            </Link>
        </nav>
    </div>
  );
}
