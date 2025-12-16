

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
    Utensils,
    Bus,
    Bed,
    Building,
    HeartPulse,
    Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import type { admin_role, UserProfile } from '@/lib/data-types';

type PermissionKey = keyof NonNullable<UserProfile['permissions']>;

const navLinks = [
    {
      group: "Principal",
      icon: LayoutDashboard,
      links: [
        { href: '/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
      ]
    },
    {
      group: "École",
      icon: School,
      links: [
        { href: '/dashboard/dossiers-eleves', label: 'Élèves', icon: Users, permission: 'viewUsers' as PermissionKey },
        { href: '/dashboard/rh', label: 'Personnel', icon: Briefcase, permission: 'viewUsers' as PermissionKey },
        { href: '/dashboard/sante', label: 'Santé', icon: HeartPulse, permission: 'manageContent' as PermissionKey },
        { href: '/dashboard/cantine', label: 'Cantine', icon: Utensils, permission: 'manageContent' as PermissionKey },
        { href: '/dashboard/transport', label: 'Transport', icon: Bus, permission: 'manageContent' as PermissionKey },
        { href: '/dashboard/internat', label: 'Internat', icon: Bed, permission: 'manageContent' as PermissionKey },
        { href: '/dashboard/immobilier', label: 'Immobilier', icon: Building, permission: 'manageContent' as PermissionKey },
        { href: '/dashboard/activites', label: 'Activités', icon: Trophy, permission: 'manageContent' as PermissionKey },
      ]
    },
    {
      group: "Pédagogie",
      icon: GraduationCap,
      links: [
        { href: '/dashboard/pedagogie/structure', label: 'Structure Scolaire', icon: School, permission: 'manageClasses' as PermissionKey },
        { href: '/dashboard/emploi-du-temps', label: 'Emploi du temps', icon: CalendarClock, permission: 'manageClasses' as PermissionKey },
        { href: '/dashboard/notes', label: 'Saisie des Notes', icon: FileText, permission: 'manageGrades' as PermissionKey },
        { href: '/dashboard/absences', label: 'Gestion des Absences', icon: UserX, permission: 'manageGrades' as PermissionKey },
        { href: '/dashboard/bibliotheque', label: 'Bibliothèque', icon: BookOpen, permission: 'manageContent' as PermissionKey },
      ]
    },
     {
      group: "Finance",
      icon: Wallet,
      links: [
        { href: '/dashboard/inscription', label: 'Inscriptions', icon: UserPlus, permission: 'manageUsers' as PermissionKey },
        { href: '/dashboard/frais-scolarite', label: 'Frais de scolarité', icon: GraduationCap, permission: 'manageBilling' as PermissionKey },
        { href: '/dashboard/paiements', label: 'Suivi des Paiements', icon: Wallet, permission: 'manageBilling' as PermissionKey },
        { href: '/dashboard/comptabilite', label: 'Comptabilité', icon: Landmark, permission: 'manageBilling' as PermissionKey },
      ]
    },
    {
      group: "Communication",
      icon: Send,
      links: [
        { href: '/dashboard/messagerie', label: 'Messagerie', icon: Send, permission: 'manageContent' as PermissionKey },
      ]
    },
     {
      group: "Configuration",
      icon: Settings,
      links: [
        { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings, permission: 'manageSettings' as PermissionKey },
      ]
    },
    {
      group: "Super Admin",
      icon: Shield,
      links: [
        { href: '/dashboard/admin/abonnements', label: 'Abonnements', icon: CreditCard, adminOnly: true },
        { href: '/dashboard/admin/roles', label: 'Gestion des Rôles', icon: Shield, adminOnly: true },
      ],
      adminOnly: true,
    }
  ];

const NavLink = ({ href, icon: Icon, label, collapsed }: { href: string; icon: React.ElementType; label: string, collapsed?: boolean }) => {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={href}
                        className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                            isActive && "bg-accent text-accent-foreground"
                        )}
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
            className={cn(
                "group flex items-center gap-x-3 rounded-lg p-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground"
            )}
        >
             <div className="flex h-6 w-6 items-center justify-center">
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
             </div>
            <span>{label}</span>
        </Link>
    );
};

export function MainNav({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useUser();
  const isAdmin = user?.customClaims?.admin === true || user?.authUser?.email === "magloire078@gmail.com";
  const userPermissions = user?.profile?.permissions || {};
  const pathname = usePathname();

  const hasPermission = (permission?: PermissionKey) => {
    if (isAdmin) return true; // Super admin sees everything
    if (!permission) return true; // Link is public within the dashboard
    return !!userPermissions[permission];
  };
  
  if (collapsed) {
      return (
          <nav className="flex flex-col items-center gap-2 px-2 py-4">
               {navLinks.flatMap(group => {
                   if (group.adminOnly && !isAdmin) return [];
                   return group.links.filter(link => hasPermission(link.permission)).map(link => (
                       <NavLink key={link.href} {...link} collapsed />
                   ));
               })}
          </nav>
      );
  }

  const defaultActiveGroup = navLinks.find(group => group.links.some(link => hasPermission(link.permission) && pathname.startsWith(link.href) && link.href !== '/dashboard'))?.group || "Principal";

  return (
    <Accordion type="single" collapsible defaultValue={defaultActiveGroup} className="w-full">
      {navLinks.map((group) => {
          if (group.adminOnly && !isAdmin) return null;
          
          const visibleLinks = group.links.filter(link => hasPermission(link.permission));
          if (visibleLinks.length === 0) return null;

          // Special case for Cantine to point to the main page
          if (group.group === 'École') {
              const cantineLink = visibleLinks.find(l => l.label === 'Cantine');
              if(cantineLink) cantineLink.href = '/dashboard/cantine';
          }

          if (visibleLinks.length === 1 && (group.group === "Principal" || group.group === "Configuration")) {
              return <NavLink key={visibleLinks[0].href} {...visibleLinks[0]} collapsed={false} />;
          }

          return (
            <AccordionItem value={group.group} key={group.group} className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg hover:no-underline [&[data-state=open]>div>svg.chevron]:rotate-180">
                    <div className="flex flex-1 items-center justify-between">
                         <div className="flex items-center gap-x-3">
                            <div className="flex h-6 w-6 items-center justify-center">
                                <group.icon className="h-5 w-5" />
                            </div>
                            <span>{group.group}</span>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pb-1 pl-4">
                    <div className="space-y-1">
                        {visibleLinks.map((link) => (
                           <NavLink key={link.href} {...link} collapsed={false} />
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
          );
      })}
    </Accordion>
  );
}

    

