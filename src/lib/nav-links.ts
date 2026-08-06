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
  ShieldAlert,
  BarChart3,
  List,
  History,
  Scroll,
  Package,
  Bell,
  Link as LinkIcon,
  Database,
  ReceiptText,
  Printer,
  Download,
  Lock,
  Star,
  User,
  Folder,
  Tag,
  ClipboardList,
  Columns,
  Image,
  Play,
  Calculator,
  FileDown
} from 'lucide-react';
import type { UserProfile } from '@/lib/data-types';

type PermissionKey = keyof NonNullable<UserProfile['permissions']>;
type Module = 'sante' | 'cantine' | 'transport' | 'internat' | 'immobilier' | 'activites' | 'rh';

export interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: PermissionKey;
  module?: Module;
  isSeparator?: boolean;
  subLinks?: NavLink[];
}

export interface NavGroup {
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
      { href: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
      { href: '/dashboard/analytics', label: 'Statistiques', icon: BarChart3, permission: 'viewAnalytics' },
    ]
  },
  {
    group: "Vie Scolaire",
    icon: Users,
    links: [
      { 
        href: '/dashboard/dossiers-eleves', 
        label: 'Élèves', 
        icon: Users, 
        permission: 'viewUsers',
        subLinks: [
          { href: '/dashboard/dossiers-eleves', label: 'Dossiers Élèves', icon: Users },
          { href: '/dashboard/dossiers-eleves/import-export', label: 'Import / Export', icon: Database },
          { href: '/dashboard/dossiers-eleves/attribution', label: 'Affectations', icon: School },
          { href: '/dashboard/dossiers-eleves/presences', label: 'Présences', icon: CalendarClock },
          { href: '/dashboard/dossiers-eleves/imprimer', label: 'Impression listes', icon: Printer },
        ]
      },
      { 
        href: '/dashboard/discipline', 
        label: 'Discipline & Santé', 
        icon: ShieldAlert, 
        permission: 'manageDiscipline',
        subLinks: [
          { href: '/dashboard/discipline', label: 'Discipline', icon: ShieldAlert },
          { href: '/dashboard/sante', label: 'Santé & Suivi', icon: HeartPulse, permission: 'manageMedical', module: 'sante' },
        ]
      },
      {
        href: '/dashboard/cantine',
        label: 'Services & Cantine',
        icon: Utensils,
        permission: 'manageCantine',
        module: 'cantine',
        subLinks: [
          { href: '/dashboard/cantine', label: 'Cantine', icon: Utensils },
          { href: '/dashboard/stocks', label: 'Stocks cantine', icon: Package, permission: 'manageInventory' },
          { href: '/dashboard/transport', label: 'Transports', icon: Bus, permission: 'manageTransport', module: 'transport' },
          { href: '/dashboard/internat', label: 'Internat', icon: Bed, permission: 'manageInternat', module: 'internat' },
          { href: '/dashboard/activites/dashboard', label: 'Activités', icon: Trophy, permission: 'manageActivities', module: 'activites' },
        ]
      },
      {
        href: '/dashboard/immobilier/dashboard',
        label: 'Immobilier & Locaux',
        icon: Building,
        permission: 'manageInventory',
        module: 'immobilier',
        subLinks: [
          { href: '/dashboard/immobilier/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
          { href: '/dashboard/immobilier/batiments', label: 'Bâtiments & Salles', icon: Building, permission: 'manageRooms' },
          { href: '/dashboard/immobilier/inventaire', label: 'Inventaire', icon: GanttChartSquare },
          { href: '/dashboard/immobilier/maintenance', label: 'Maintenance', icon: Wrench },
          { href: '/dashboard/immobilier/reservations', label: 'Réservations', icon: CalendarClock, permission: 'manageRooms' },
          { href: '/dashboard/immobilier/cles', label: 'Clés', icon: KeyRound },
        ]
      }
    ]
  },
  {
    group: "Pédagogie & Notes",
    icon: School,
    links: [
      { href: '/dashboard/classes', label: 'Classes', icon: School, permission: 'manageClasses' },
      { href: '/dashboard/emploi-du-temps', label: 'Emplois du temps', icon: CalendarClock, permission: 'manageSchedule' },
      { 
        href: '/dashboard/notes/fiche', 
        label: 'Carnet de Notes', 
        icon: FileText, 
        permission: 'manageGrades',
        subLinks: [
          { href: '/dashboard/notes/fiche', label: 'Saisie des Notes', icon: FileText },
          { href: '/dashboard/notes/moyennes', label: 'Moyennes', icon: Calculator },
          { href: '/dashboard/notes/calculs', label: 'Calculs & Rangs', icon: Play },
          { href: '/dashboard/notes/matrices', label: 'Matrices', icon: GanttChartSquare },
          { href: '/dashboard/notes/bulletins-classe', label: 'Bulletins classe', icon: FileDown },
          { href: '/dashboard/notes/bulletins-eleve', label: 'Bulletins élèves', icon: User },
          { href: '/dashboard/notes/verrouillage', label: 'Verrouillage', icon: Lock },
        ]
      },
      { 
        href: '/dashboard/documents/attestation', 
        label: 'Documents & Fiches', 
        icon: Folder, 
        permission: 'viewUsers',
        subLinks: [
          { href: '/dashboard/documents/attestation', label: 'Attestations', icon: FileText },
          { href: '/dashboard/documents/cartes', label: 'Cartes Scolaires', icon: CreditCard },
          { href: '/dashboard/documents/fiche', label: 'Fiches Scolaires', icon: FileText },
          { href: '/dashboard/documents/honneur', label: "Tableau d'honneur", icon: Star },
          { href: '/dashboard/documents/majors', label: 'Majors de classe', icon: Trophy },
          { href: '/dashboard/documents/listes-classe', label: 'Listes nominatives', icon: List },
          { href: '/dashboard/documents/trombinoscope', label: 'Trombinoscope', icon: Image },
          { href: '/dashboard/documents/recapitulatif', label: 'Récapitulatif', icon: Columns },
        ]
      },
      { href: '/dashboard/pedagogie/matieres', label: 'Matières & Mentions', icon: BookOpen, permission: 'manageClasses' },
    ]
  },
  {
    group: "Comptabilité",
    icon: Wallet,
    links: [
      { 
        href: '/dashboard/inscription', 
        label: 'Inscriptions & Tarifs', 
        icon: UserPlus, 
        permission: 'manageBilling',
        subLinks: [
          { href: '/dashboard/inscription', label: 'Inscriptions', icon: UserPlus },
          { href: '/dashboard/paiements', label: 'Versements', icon: CreditCard },
          { href: '/dashboard/frais-scolarite', label: 'Frais & Tarifs', icon: ReceiptText },
        ]
      },
      { href: '/dashboard/comptabilite', label: 'Caisse & Dépenses', icon: Landmark, permission: 'manageBilling' },
      { 
        href: '/dashboard/rapports-paiements', 
        label: 'Rapports Financiers', 
        icon: BarChart3, 
        permission: 'manageBilling',
        subLinks: [
          { href: '/dashboard/rapports-paiements/aujourd-hui', label: "Aujourd'hui", icon: History },
          { href: '/dashboard/rapports-paiements/tous', label: 'Journal des Paiements', icon: List },
          { href: '/dashboard/rapports-paiements/par-classe', label: 'Par classe', icon: School },
          { href: '/dashboard/rapports-paiements/par-periode', label: 'Par période', icon: CalendarClock },
          { href: '/dashboard/rapports-paiements/tous-rapports', label: 'Rapports avancés', icon: ReceiptText },
        ]
      },
    ]
  },
  {
    group: "RH & Paie",
    icon: Briefcase,
    links: [
      { 
        href: '/dashboard/rh/personnel', 
        label: 'Personnel & Paie', 
        icon: Briefcase, 
        permission: 'viewUsers',
        subLinks: [
          { href: '/dashboard/rh/personnel', label: 'Enseignants', icon: GraduationCap },
          { href: '/dashboard/rh/administration', label: 'Habilitations', icon: Shield },
          { href: '/dashboard/rh/paie', label: 'Salaires & Paie', icon: Banknote },
        ]
      },
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
  }
];

export const parametresSubLinks = [
  { href: '/dashboard/parametres', label: 'Général', icon: Settings, permission: 'manageSettings' as PermissionKey },
  { href: '/dashboard/parametres/fiche-etablissement', label: 'Fiche Établissement', icon: Building, permission: 'manageSettings' as PermissionKey },
  { href: '/dashboard/parametres/annee-scolaire', label: 'Année Scolaire', icon: CalendarClock, permission: 'manageSettings' as PermissionKey },
  { href: '/dashboard/parametres/abonnement', label: 'Abonnement', icon: CreditCard, permission: 'manageSettings' as PermissionKey },
  { href: '/dashboard/parametres/facturation', label: 'Facturation', icon: ReceiptText, permission: 'manageSettings' as PermissionKey },
  { href: '/dashboard/parametres/configuration-paiements', label: 'Config. Paiements', icon: Wallet, permission: 'manageSettings' as PermissionKey },
  { href: '/dashboard/parametres/integrations', label: 'Intégrations', icon: LinkIcon, permission: 'manageSettings' as PermissionKey },
  { href: '/dashboard/parametres/notifications', label: 'Notifications', icon: Bell, permission: 'manageSettings' as PermissionKey },
  { href: '/dashboard/parametres/audit', label: 'Audit & Sécurité', icon: ShieldAlert, permission: 'manageSettings' as PermissionKey },
  { href: '/dashboard/parametres/donnees', label: 'Maintenance Données', icon: Database, permission: 'manageSettings' as PermissionKey },
];

export const transportSubLinks = [
  { href: '/dashboard/transport/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, permission: 'manageTransport' as PermissionKey, module: 'transport' as Module },
  { href: '/dashboard/transport/bus', label: 'Bus', icon: Bus, permission: 'manageTransport' as PermissionKey, module: 'transport' as Module },
  { href: '/dashboard/transport/lignes', label: 'Lignes', icon: Map, permission: 'manageTransport' as PermissionKey, module: 'transport' as Module },
  { href: '/dashboard/transport/abonnements', label: 'Abonnements', icon: Ticket, permission: 'manageTransport' as PermissionKey, module: 'transport' as Module },
];

export const cantineSubLinks = [
  { href: '/dashboard/cantine', label: 'Tableau de bord', icon: LayoutDashboard, permission: 'manageCantine' as PermissionKey, module: 'cantine' as Module },
  { href: '/dashboard/stocks', label: 'Gestion des Stocks', icon: Package, permission: 'manageInventory' as PermissionKey },
  { href: '/dashboard/cantine/reservations', label: 'Réservations', icon: CalendarClock, permission: 'manageCantine' as PermissionKey, module: 'cantine' as Module },
  { href: '/dashboard/cantine/abonnements', label: 'Abonnements', icon: Ticket, permission: 'manageCantine' as PermissionKey, module: 'cantine' as Module },
];

export const internatSubLinks = [
  { href: '/dashboard/internat/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, permission: 'manageInternat' as PermissionKey, module: 'internat' as Module },
  { href: '/dashboard/internat/batiments', label: 'Bâtiments & Chambres', icon: Building, permission: 'manageInternat' as PermissionKey, module: 'internat' as Module },
  { href: '/dashboard/internat/occupants', label: 'Occupants', icon: Users, permission: 'manageInternat' as PermissionKey, module: 'internat' as Module },
  { href: '/dashboard/internat/journal', label: 'Journal', icon: History, permission: 'manageInternat' as PermissionKey, module: 'internat' as Module },
];

export const immobilierSubLinks = [
  { href: '/dashboard/immobilier/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, permission: 'manageInventory' as PermissionKey, module: 'immobilier' as Module },
  { href: '/dashboard/immobilier/batiments', label: 'Bâtiments & Salles', icon: Building, permission: 'manageRooms' as PermissionKey, module: 'immobilier' as Module },
  { href: '/dashboard/immobilier/inventaire', label: 'Inventaire', icon: GanttChartSquare, permission: 'manageInventory' as PermissionKey, module: 'immobilier' as Module },
  { href: '/dashboard/immobilier/maintenance', label: 'Maintenance', icon: Wrench, permission: 'manageInventory' as PermissionKey, module: 'immobilier' as Module },
  { href: '/dashboard/immobilier/reservations', label: 'Réservations', icon: CalendarClock, permission: 'manageRooms' as PermissionKey, module: 'immobilier' as Module },
  { href: '/dashboard/immobilier/cles', label: 'Clés', icon: KeyRound, permission: 'manageInventory' as PermissionKey, module: 'immobilier' as Module },
];

export const rhSubLinks = [
  { href: '/dashboard/rh/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, permission: 'viewUsers' as PermissionKey, module: 'rh' as Module },
  { href: '/dashboard/rh/personnel', label: 'Personnel', icon: Users, permission: 'viewUsers' as PermissionKey, module: 'rh' as Module },
  { href: '/dashboard/rh/paie', label: 'Paie', icon: Banknote, permission: 'manageBilling' as PermissionKey, module: 'rh' as Module },
  { href: '/dashboard/rh/conges', label: 'Congés', icon: CalendarClock, permission: 'manageUsers' as PermissionKey, module: 'rh' as Module },
];

export const activitesSubLinks = [
  { href: '/dashboard/activites/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/activites', label: 'Activités', icon: Trophy },
  { href: '/dashboard/activites/inscriptions', label: 'Inscriptions', icon: UserPlus },
  { href: '/dashboard/activites/competitions', label: 'Compétitions', icon: List },
];
