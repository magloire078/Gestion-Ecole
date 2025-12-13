
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
import { useUser } from '@/firebase';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const navLinks = [
    {
      group: "Principal",
      links: [
        { href: '/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, adminOnly: false },
      ]
    },
    {
      group: "École",
      links: [
        { href: '/dashboard/dossiers-eleves', label: 'Élèves', icon: Users, adminOnly: false },
        { href: '/dashboard/classes', label: 'Classes', icon: School, adminOnly: false },
        { href: '/dashboard/emploi-du-temps', label: 'Emploi du temps', icon: CalendarClock, adminOnly: false },
        { href: '/dashboard/rh', label: 'RH / Personnel', icon: Briefcase, adminOnly: false },
      ]
    },
    {
      group: "Pédagogie",
      links: [
        { href: '/dashboard/notes', label: 'Saisie des Notes', icon: FileText, adminOnly: false },
        { href: '/dashboard/absences', label: 'Gestion des Absences', icon: UserX, adminOnly: false },
        { href: '/dashboard/bibliotheque', label: 'Bibliothèque', icon: BookOpen, adminOnly: false },
      ]
    },
     {
      group: "Finance",
      links: [
        { href: '/dashboard/inscription', label: 'Inscriptions', icon: UserPlus, adminOnly: false },
        { href: '/dashboard/frais-scolarite', label: 'Frais de scolarité', icon: GraduationCap, adminOnly: false },
        { href: '/dashboard/paiements', label: 'Suivi des Paiements', icon: Wallet, adminOnly: false },
        { href: '/dashboard/comptabilite', label: 'Comptabilité', icon: Landmark, adminOnly: false },
      ]
    },
    {
      group: "Communication",
      links: [
        { href: '/dashboard/messagerie', label: 'Messagerie', icon: Send, adminOnly: false },
      ]
    },
     {
      group: "Configuration",
      links: [
        { href: '/dashboard/parametres', label: 'Paramètres généraux', icon: Settings, adminOnly: false },
        { href: '/dashboard/parametres/abonnement', label: 'Abonnement', icon: CreditCard, adminOnly: false },
        { href: '/dashboard/parametres/donnees', label: 'Données Brutes', icon: Database, adminOnly: false },
      ]
    },
    {
      group: "Super Admin",
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
  const isAdmin = user?.customClaims?.role === 'admin';
  
  if (collapsed) {
      return (
          <nav className="flex flex-col items-center gap-2 px-2 py-4">
               {navLinks.map((group) => {
                   if (group.adminOnly && !isAdmin) return null;
                   return group.links.map((link) => {
                       if (link.adminOnly && !isAdmin) return null;
                       return <NavLink key={link.href} {...link} collapsed />;
                   });
               })}
          </nav>
      );
  }

  return (
    <nav className="flex flex-col gap-y-4">
      {navLinks.map((group) => {
          if (group.adminOnly && !isAdmin) return null;
          return (
            <div key={group.group}>
                <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {group.group}
                </h3>
                 <div className="space-y-1">
                    {group.links.map((link) => {
                       if (link.adminOnly && !isAdmin) return null;
                       return <NavLink key={link.href} {...link} collapsed={false} />;
                    })}
                </div>
            </div>
          );
      })}
    </nav>
  );
}
