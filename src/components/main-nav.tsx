
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BookUser, BookOpen, Wallet, Settings, CalendarClock, NotebookText, Landmark, UserPlus, Briefcase, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


const navClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm";
const activeClass = "bg-muted text-primary";

const administrativeLinks = [
  { href: '/dashboard/registration', label: 'Inscriptions', icon: UserPlus },
  { href: '/dashboard/students', label: 'Élèves', icon: Users },
  { href: '/dashboard/teachers', label: 'Enseignants', icon: Users },
  { href: '/dashboard/hr', label: 'RH / Personnel', icon: Briefcase },
  { href: '/dashboard/classes', label: 'Classes', icon: BookUser },
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
            className={cn(navClass, pathname.startsWith(href) && activeClass)}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
};

export function MainNav() {
  const pathname = usePathname();
  
  const isLinkActive = (links: {href: string}[]) => links.some(link => pathname.startsWith(link.href));

  return (
    <nav className="flex flex-col justify-between flex-1 p-2 font-medium">
      <div className='flex-1 space-y-1'>
        <Link
          href="/dashboard"
          className={cn(navClass, pathname === '/dashboard' && activeClass)}
        >
          <LayoutDashboard className="h-4 w-4" />
          Tableau de Bord
        </Link>
        
        <Accordion type="multiple" className="w-full" defaultValue={['admin', 'pedagogy', 'finance'].filter(group => {
            if (group === 'admin') return isLinkActive(administrativeLinks);
            if (group === 'pedagogy') return isLinkActive(pedagogicalLinks);
            if (group === 'finance') return isLinkActive(financialLinks);
            return false;
        })}>
          <AccordionItem value="admin" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary">
                <span className='flex items-center gap-3'>Administration</span>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
              {administrativeLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pedagogy" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary">
                 <span className='flex items-center gap-3'>Pédagogie</span>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {pedagogicalLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="finance" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline hover:text-primary text-sm font-semibold text-muted-foreground [&[data-state=open]>svg]:text-primary">
                 <span className='flex items-center gap-3'>Finance</span>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 space-y-1">
               {financialLinks.map(item => <NavLink key={item.href} {...item} />)}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div>
        <Link
          href="/dashboard/settings"
          className={cn(navClass, pathname.startsWith('/dashboard/settings') && activeClass)}
        >
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
      </div>
    </nav>
  );
}
