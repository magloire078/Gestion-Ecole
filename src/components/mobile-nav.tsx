

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
import { useUser } from '@/firebase';
import type { admin_role } from '@/lib/data-types';

type PermissionKey = keyof admin_role['permissions'];

const navLinks = [
  {
    group: "Principal",
    links: [
      { href: '/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    ]
  },
  {
    group: "École",
    links: [
      { href: '/dashboard/dossiers-eleves', label: 'Élèves', icon: Users, permission: 'viewUsers' as PermissionKey },
      { href: '/dashboard/rh', label: 'Personnel', icon: Briefcase, permission: 'viewUsers' as PermissionKey },
    ]
  },
  {
    group: "Pédagogie",
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
    links: [
      { href: '/dashboard/inscription', label: 'Inscriptions', icon: UserPlus, permission: 'manageUsers' as PermissionKey },
      { href: '/dashboard/frais-scolarite', label: 'Frais de scolarité', icon: GraduationCap, permission: 'manageBilling' as PermissionKey },
      { href: '/dashboard/paiements', label: 'Suivi des Paiements', icon: Wallet, permission: 'manageBilling' as PermissionKey },
      { href: '/dashboard/comptabilite', label: 'Comptabilité', icon: Landmark, permission: 'manageBilling' as PermissionKey },
    ]
  },
  {
    group: "Communication",
    links: [
      { href: '/dashboard/messagerie', label: 'Messagerie', icon: Send, permission: 'manageContent' as PermissionKey },
    ]
  },
   {
    group: "Configuration",
    links: [
      { href: '/dashboard/parametres', label: 'Paramètres généraux', icon: Settings, permission: 'manageSettings' as PermissionKey },
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

const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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


export function MobileNav() {
  const { user } = useUser();
  const isAdmin = user?.customClaims?.admin === true || user?.email === "magloire078@gmail.com";
  const userPermissions = user?.profile?.permissions || {};

  const hasPermission = (permission?: PermissionKey) => {
    if (isAdmin) return true; // Super admin sees everything
    if (!permission) return true; // Link is public within the dashboard
    return !!userPermissions[permission];
  };

  return (
    <div className='flex flex-col h-full'>
        <div className="flex h-16 shrink-0 items-center border-b px-6">
            <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
            {navLinks.map((group) => {
                if (group.adminOnly && !isAdmin) return null;
                const visibleLinks = group.links.filter(link => hasPermission(link.permission));
                if(visibleLinks.length === 0) return null;

                return (
                  <div key={group.group} className="mb-4">
                      <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                          {group.group}
                      </h3>
                       <div className="space-y-1">
                          {visibleLinks.map((link) => (
                             <NavLink key={link.href} {...link} />
                          ))}
                      </div>
                  </div>
                );
            })}
        </nav>
    </div>
  );
}
