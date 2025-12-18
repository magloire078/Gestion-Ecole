

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
    Map,
    Ticket,
} from 'lucide-react';
import type { UserProfile } from '@/lib/data-types';

type PermissionKey = keyof NonNullable<UserProfile['permissions']>;

export const NAV_LINKS = [
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
        { href: '/dashboard/rh', label: 'Personnel', icon: Briefcase, permission: 'viewUsers' as PermissionKey, plans: ['Pro', 'Premium'] as const },
        { href: '/dashboard/sante', label: 'Santé', icon: HeartPulse, permission: 'manageMedical' as PermissionKey, plans: ['Pro', 'Premium'] as const },
        { href: '/dashboard/cantine', label: 'Cantine', icon: Utensils, permission: 'manageCantine' as PermissionKey, plans: ['Pro', 'Premium'] as const },
        { href: '/dashboard/transport', label: 'Transport', icon: Bus, permission: 'manageTransport' as PermissionKey, plans: ['Pro', 'Premium'] as const },
        { href: '/dashboard/internat', label: 'Internat', icon: Bed, permission: 'manageInternat' as PermissionKey, plans: ['Premium'] as const },
        { href: '/dashboard/immobilier', label: 'Immobilier', icon: Building, permission: 'manageInventory' as PermissionKey, plans: ['Premium'] as const },
        { href: '/dashboard/activites', label: 'Activités', icon: Trophy, permission: 'manageActivities' as PermissionKey, plans: ['Pro', 'Premium'] as const },
      ]
    },
    {
      group: "Pédagogie",
      icon: GraduationCap,
      links: [
        { href: '/dashboard/pedagogie/structure', label: 'Structure Scolaire', icon: School, permission: 'manageClasses' as PermissionKey },
        { href: '/dashboard/emploi-du-temps', label: 'Emploi du temps', icon: CalendarClock, permission: 'manageSchedule' as PermissionKey },
        { href: '/dashboard/notes', label: 'Saisie des Notes', icon: FileText, permission: 'manageGrades' as PermissionKey },
        { href: '/dashboard/absences', label: 'Gestion des Absences', icon: UserX, permission: 'manageAttendance' as PermissionKey },
        { href: '/dashboard/bibliotheque', label: 'Bibliothèque', icon: BookOpen, permission: 'manageLibrary' as PermissionKey },
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
        { href: '/dashboard/messagerie', label: 'Messagerie', icon: Send, permission: 'manageCommunication' as PermissionKey },
      ]
    },
     {
      group: "Configuration",
      icon: Settings,
      links: [
        { href: '/dashboard/parametres', label: 'Paramètres', icon: Settings, permission: 'manageSettings' as PermissionKey },
        { href: '/dashboard/admin/roles', label: 'Gestion des Rôles', icon: Shield, permission: 'manageSettings' as PermissionKey },
      ]
    },
  ];
export const transportNavLinks = [
  { href: '/dashboard/transport/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/transport/lignes', label: 'Lignes', icon: Map },
  { href: '/dashboard/transport/bus', label: 'Flotte de Bus', icon: Bus },
  { href: '/dashboard/transport/abonnements', label: 'Abonnements', icon: Ticket },
];

