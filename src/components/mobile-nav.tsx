

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
      { href: '/dashboard/pedagogie/structure', label: 'Structure Scolaire', icon: School, adminOnly: false },
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
  // DEV ONLY: Grant admin rights to a specific email for development
  const isAdmin = user?.customClaims?.role === 'admin' || user?.email === "VOTRE_EMAIL_ADMIN@example.com";

  return (
    <div className='flex flex-col h-full'>
        <div className="flex h-16 shrink-0 items-center border-b px-6">
            <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
            {navLinks.map((group) => {
                if (group.adminOnly && !isAdmin) return null;
                return (
                  <div key={group.group} className="mb-4">
                      <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                          {group.group}
                      </h3>
                       <div className="space-y-1">
                          {group.links.map((link) => {
                             if (link.adminOnly && !isAdmin) return null;
                             return <NavLink key={link.href} {...link} />;
                          })}
                      </div>
                  </div>
                );
            })}
        </nav>
    </div>
  );
}
