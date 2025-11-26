
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BookUser, BookOpen, Wallet, Settings, CalendarClock, NotebookText, Landmark, UserPlus, Briefcase, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


const mySchoolLinks = [
  { href: '/dashboard/students', label: 'Élèves', icon: Users },
  { href: '/dashboard/classes', label: 'Classes', icon: BookUser },
  { href: '/dashboard/teachers', label: 'Professeurs', icon: Users },
];

const administrativeLinks = [
  { href: '/dashboard/registration', label: 'Inscriptions', icon: UserPlus },
  { href: '/dashboard/hr', label: 'RH / Personnel', icon: Briefcase },
  { href: '/dashboard/timetable', label: 'Emploi du temps', icon: CalendarClock },
];

const pedagogicalLinks = [
    { href: '/dashboard/reports', label: 'Saisie des Notes', icon: NotebookText },
    { href: '/dashboard/library', label: 'Bibliothèque', icon: BookOpen },
];

const financialLinks = [
  { href: '/dashboard/fees', label: 'Scolarité', icon: Wallet },
  { href: '/dashboard/accounting', label: 'Comptabilité', icon: Landmark },
];

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    return (
        <Link
            href={href}
            className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground", pathname.startsWith(href) && "text-foreground font-semibold")}
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
                className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground", pathname === '/dashboard' && "text-foreground font-semibold")}
            >
                <LayoutDashboard className="h-5 w-5" />
                Tableau de Bord
            </Link>

             <Accordion type="multiple" className="w-full" defaultValue={getDefaultOpenValues()}>
                <AccordionItem value="my-school" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-foreground text-lg font-semibold text-muted-foreground [&[data-state=open]>svg]:text-foreground">
                       <span className='flex items-center gap-3'><School className="h-5 w-5" />Mon École</span>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {mySchoolLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>
             
                <AccordionItem value="pedagogy" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-foreground text-lg font-semibold text-muted-foreground [&[data-state=open]>svg]:text-foreground">
                        Pédagogie
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {pedagogicalLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="finance" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline hover:text-foreground text-lg font-semibold text-muted-foreground [&[data-state=open]>svg]:text-foreground">
                        Finance
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 pt-2 space-y-4">
                        {financialLinks.map(item => <NavLink key={item.href} {...item} />)}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </nav>
        <div className='p-6 border-t'>
             <Link
                href="/dashboard/settings"
                className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground", pathname.startsWith('/dashboard/settings') && "text-foreground font-semibold")}
            >
                <Settings className="h-5 w-5" />
                Paramètres
            </Link>
        </div>
    </div>
  );
}
