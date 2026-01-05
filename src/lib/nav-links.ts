

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
    Trophy,
    Banknote,
    LandPlot,
    Map,
    Ticket,
    DoorOpen,
    GanttChartSquare,
    Wrench,
    KeyRound,
    Handshake,
    LifeBuoy,
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
        { href: '/dashboard/sante', label: 'Santé', icon: HeartPulse, permission: 'manageMedical', module: 'sante' },
        { href: '/dashboard/cantine', label: 'Cantine', icon: Utensils, permission: 'manageCantine', module: 'cantine' },
        { href: '/dashboard/transport', label: 'Transport', icon: Bus, permission: 'manageTransport', module: 'transport' },
        { href: '/dashboard/internat', label: 'Internat', icon: Bed, permission: 'manageInternat', module: 'internat' },
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
      group: "RH & Paie",
      icon: Briefcase,
      links: [
        { href: '/dashboard/rh', label: 'Personnel', icon: Users, permission: 'viewUsers', module: 'rh' },
      ]
    },
    {
      group: "Immobilier",
      icon: LandPlot,
      links: [
        { href: '/dashboard/immobilier/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, permission: 'manageInventory', module: 'immobilier' },
        { href: '/dashboard/immobilier/batiments', label: 'Bâtiments', icon: Building, permission: 'manageRooms', module: 'immobilier' },
        { href: '/dashboard/immobilier/salles', label: 'Salles', icon: DoorOpen, permission: 'manageRooms', module: 'immobilier' },
        { href: '/dashboard/immobilier/inventaire', label: 'Inventaire', icon: GanttChartSquare, permission: 'manageInventory', module: 'immobilier' },
        { href: '/dashboard/immobilier/maintenance', label: 'Maintenance', icon: Wrench, permission: 'manageInventory', module: 'immobilier' },
        { href: '/dashboard/immobilier/reservations', label: 'Réservations', icon: CalendarClock, permission: 'manageRooms', module: 'immobilier' },
        { href: '/dashboard/immobilier/cles', label: 'Clés', icon: KeyRound, permission: 'manageInventory', module: 'immobilier' },
      ]
    },
    {
      group: "Communication",
      icon: Send,
      links: [
        { href: '/dashboard/messagerie', label: 'Messagerie', icon: Send, permission: 'manageCommunication' },
        { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
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
             { href: '/admin/system/settings', label: 'Paramètres', icon: Settings },
        ]
    },
  ];

// Ajout conceptuel des sous-liens. La logique de rendu est dans le layout respectif.
export const transportSubLinks = [
    { href: '/dashboard/transport/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, permission: 'manageTransport' as PermissionKey, module: 'transport' as Module },
    { href: '/dashboard/transport/bus', label: 'Bus', icon: Bus, permission: 'manageTransport' as PermissionKey, module: 'transport' as Module },
    { href: '/dashboard/transport/lignes', label: 'Lignes', icon: Map, permission: 'manageTransport' as PermissionKey, module: 'transport' as Module },
    { href: '/dashboard/transport/abonnements', label: 'Abonnements', icon: Ticket, permission: 'manageTransport' as PermissionKey, module: 'transport' as Module },
];

export const internatSubLinks = [
    { href: '/dashboard/internat/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, permission: 'manageInternat' as PermissionKey, module: 'internat' as Module },
    { href: '/dashboard/internat/batiments', label: 'Bâtiments', icon: Building, permission: 'manageInternat' as PermissionKey, module: 'internat' as Module },
    { href: '/dashboard/internat/chambres', label: 'Chambres', icon: Bed, permission: 'manageInternat' as PermissionKey, module: 'internat' as Module },
    { href: '/dashboard/internat/occupants', label: 'Occupants', icon: Users, permission: 'manageInternat' as PermissionKey, module: 'internat' as Module },
];

export const immobilierSubLinks = [
    { href: '/dashboard/immobilier/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, permission: 'manageInventory' as PermissionKey, module: 'immobilier' as Module },
    { href: '/dashboard/immobilier/batiments', label: 'Bâtiments', icon: Building, permission: 'manageRooms' as PermissionKey, module: 'immobilier' as Module },
    { href: '/dashboard/immobilier/salles', label: 'Salles', icon: DoorOpen, permission: 'manageRooms' as PermissionKey, module: 'immobilier' as Module },
    { href: '/dashboard/immobilier/inventaire', label: 'Inventaire', icon: GanttChartSquare, permission: 'manageInventory' as PermissionKey, module: 'immobilier' as Module },
    { href: '/dashboard/immobilier/maintenance', label: 'Maintenance', icon: Wrench, permission: 'manageInventory' as PermissionKey, module: 'immobilier' as Module },
    { href: '/dashboard/immobilier/reservations', label: 'Réservations', icon: CalendarClock, permission: 'manageRooms' as PermissionKey, module: 'immobilier' as Module },
    { href: '/dashboard/immobilier/cles', label: 'Clés', icon: KeyRound, permission: 'manageInventory' as PermissionKey, module: 'immobilier' as Module },
];

export const rhSubLinks = [
    { href: '/dashboard/rh/personnel', label: 'Personnel', icon: Users, permission: 'viewUsers' as PermissionKey, module: 'rh' as Module },
    { href: '/dashboard/rh/paie', label: 'Paie', icon: Banknote, permission: 'manageBilling' as PermissionKey, module: 'rh' as Module },
];
