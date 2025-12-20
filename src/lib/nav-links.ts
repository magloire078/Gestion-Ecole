
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
    Shield,
    Utensils,
    Bus,
    Bed,
    Building,
    HeartPulse,
    Trophy
} from 'lucide-react';
import type { UserProfile } from '@/lib/data-types';

type PermissionKey = keyof NonNullable<UserProfile['permissions']>;
type Module = 'sante' | 'cantine' | 'transport' | 'internat' | 'immobilier' | 'activites' | 'rh';

interface NavLink {
    href: string;
    label: string;
    icon: React.ElementType;
    permission?: PermissionKey;
    module?: Module;
}

interface NavGroup {
    group: string;
    icon: React.ElementType;
    links: NavLink[];
    adminOnly?: boolean;
}

export const NAV_LINKS: NavGroup[] = [
    {
      group: "Principal",
      icon: LayoutDashboard,
      links: [
        { href: '/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
      ]
    },
    {
      group: "Vie Scolaire",
      icon: School,
      links: [
        { href: '/dashboard/dossiers-eleves', label: 'Élèves', icon: Users, permission: 'viewUsers' },
        { href: '/dashboard/rh', label: 'Personnel', icon: Briefcase, permission: 'viewUsers', module: 'rh' },
        { href: '/dashboard/sante', label: 'Santé', icon: HeartPulse, permission: 'manageMedical', module: 'sante' },
        { href: '/dashboard/cantine', label: 'Cantine', icon: Utensils, permission: 'manageCantine', module: 'cantine' },
        { href: '/dashboard/transport', label: 'Transport', icon: Bus, permission: 'manageTransport', module: 'transport' },
        { href: '/dashboard/internat', label: 'Internat', icon: Bed, permission: 'manageInternat', module: 'internat' },
        { href: '/dashboard/immobilier', label: 'Immobilier', icon: Building, permission: 'manageInventory', module: 'immobilier' },
        { href: '/dashboard/activites', label: 'Activités', icon: Trophy, permission: 'manageActivities', module: 'activites' },
      ]
    },
    {
      group: "Pédagogie",
      icon: GraduationCap,
      links: [
        { href: '/dashboard/pedagogie/structure', label: 'Structure Scolaire', icon: School, permission: 'manageClasses' },
        { href: '/dashboard/emploi-du-temps', label: 'Emploi du temps', icon: CalendarClock, permission: 'manageSchedule' },
        { href: '/dashboard/notes', label: 'Saisie des Notes', icon: FileText, permission: 'manageGrades' },
        { href: '/dashboard/absences', label: 'Gestion des Absences', icon: UserX, permission: 'manageAttendance' },
        { href: '/dashboard/bibliotheque', label: 'Bibliothèque', icon: BookOpen, permission: 'manageLibrary' },
      ]
    },
     {
      group: "Finance",
      icon: Wallet,
      links: [
        { href: '/dashboard/inscription', label: 'Inscriptions', icon: UserPlus, permission: 'manageUsers' },
        { href: '/dashboard/frais-scolarite', label: 'Frais de scolarité', icon: GraduationCap, permission: 'manageBilling' },
        { href: '/dashboard/paiements', label: 'Suivi des Paiements', icon: Wallet, permission: 'manageBilling' },
        { href: '/dashboard/comptabilite', label: 'Comptabilité', icon: Landmark, permission: 'manageBilling' },
      ]
    },
    {
      group: "Communication",
      icon: Send,
      links: [
        { href: '/dashboard/messagerie', label: 'Messagerie', icon: Send, permission: 'manageCommunication' },
      ]
    },
     {
      group: "Configuration",
      icon: Settings,
      links: [
        { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings, permission: 'manageSettings' },
        { href: '/dashboard/admin/roles', label: 'Gestion des Rôles', icon: Shield, permission: 'manageSettings' },
      ]
    },
    {
        group: "Admin Système",
        icon: Shield,
        adminOnly: true,
        links: [
            { href: '/admin/system/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
            { href: '/admin/system/schools', label: 'Écoles', icon: Building },
            { href: '/admin/system/admins', label: 'Administrateurs', icon: Users },
        ]
    },
  ];
