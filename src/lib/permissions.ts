
export const permissionCategories = [
    { id: 'users', label: 'Utilisateurs & Profils', icon: 'Users' },
    { id: 'pedagogy', label: 'Pédagogie & Scolarité', icon: 'GraduationCap' },
    { id: 'finance', label: 'Finance & Logistique', icon: 'Wallet' },
    { id: 'services', label: 'Services & Vie Scolaire', icon: 'Bell' },
    { id: 'admin', label: 'Administration & Système', icon: 'Settings' },
] as const;

export type PermissionCategory = typeof permissionCategories[number]['id'];

export const allPermissionsList = [
    // Utilisateurs
    { id: 'manageUsers', category: 'users', label: 'Gérer Utilisateurs', desc: 'Créer, modifier, supprimer élèves et personnel.' },
    { id: 'viewUsers', category: 'users', label: 'Voir Utilisateurs', desc: 'Consulter les listes et profils.' },
    
    // Pédagogie
    { id: 'manageClasses', category: 'pedagogy', label: 'Gérer Classes', desc: 'Créer, modifier la structure scolaire.' },
    { id: 'manageGrades', category: 'pedagogy', label: 'Gérer Notes', desc: 'Saisir et modifier les notes des élèves.' },
    { id: 'viewGrades', category: 'pedagogy', label: 'Voir Notes', desc: 'Consulter les notes et bulletins des élèves.'},
    { id: 'manageDiscipline', category: 'pedagogy', label: 'Gérer Discipline', desc: "Suivre et gérer les incidents disciplinaires."},
    { id: 'manageSchedule', category: 'pedagogy', label: 'Gérer Emploi du temps', desc: 'Modifier les emplois du temps.' },
    { id: 'manageAttendance', category: 'pedagogy', label: 'Gérer Absences', desc: 'Enregistrer les absences des élèves.' },
    
    // Finance
    { id: 'manageBilling', category: 'finance', label: 'Gérer Facturation', desc: 'Gérer les paiements, frais et comptabilité.' },
    { id: 'manageInventory', category: 'finance', label: 'Gérer Inventaire', desc: 'Gérer le matériel de l\'école.' },
    
    // Services
    { id: 'manageCommunication', category: 'services', label: 'Gérer Communication', desc: 'Envoyer des messages à la communauté.' },
    { id: 'manageLibrary', category: 'services', label: 'Gérer Bibliothèque', desc: 'Ajouter/supprimer des livres.' },
    { id: 'manageCantine', category: 'services', label: 'Gérer Cantine', desc: 'Gérer les menus et réservations.' },
    { id: 'manageTransport', category: 'services', label: 'Gérer Transport', desc: 'Gérer la flotte, les lignes et abonnements.' },
    { id: 'manageInternat', category: 'services', label: 'Gérer Internat', desc: 'Gérer les bâtiments, chambres et occupants.' },
    { id: 'manageActivities', category: 'services', label: 'Gérer Activités', desc: 'Gérer les activités parascolaires.' },
    { id: 'manageMedical', category: 'services', label: 'Gérer Dossiers Médicaux', desc: 'Accès et modification des dossiers de santé.' },
    
    // Admin
    { id: 'manageSettings', category: 'admin', label: 'Gérer Paramètres École', desc: 'Modifier les paramètres de l\'établissement.' },
    { id: 'viewAnalytics', category: 'admin', label: 'Voir Statistiques', desc: 'Accéder aux tableaux de bord analytiques.'},
    { id: 'viewSupportTickets', category: 'admin', label: 'Voir Tickets Support', desc: 'Consulter les tickets de support.' },
    { id: 'manageSupportTickets', category: 'admin', label: 'Gérer Tickets Support', desc: 'Répondre et fermer les tickets.' },
    { id: 'manageRooms', category: 'admin', label: 'Gérer Salles', desc: 'Créer et modifier les salles.' },
] as const;

export type PermissionId = typeof allPermissionsList[number]['id'];

export const allPermissions = allPermissionsList.reduce((acc, p) => {
    acc[p.id] = true;
    return acc;
}, {} as Record<PermissionId, boolean>);
