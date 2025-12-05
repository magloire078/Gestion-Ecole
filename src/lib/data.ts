

export type AccountingTransaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'Revenu' | 'Dépense';
  amount: number;
};

export const allSubjects = [
    "Mathématiques",
    "Français",
    "Philosophie",
    "Anglais",
    "Histoire-Géographie",
    "Physique-Chimie",
    "SVT",
    "Histoire",
    "Géographie",
    "Arts Plastiques",
    "Musique",
    "EPS"
];

// --- Données standardisées pour le système éducatif ---

export const schoolCycles = [
    { name: "Maternelle", order: 1 },
    { name: "Enseignement Primaire", order: 2 },
    { name: "Enseignement Secondaire - Premier cycle", order: 3 },
    { name: "Enseignement Secondaire - Deuxième cycle", order: 4 },
    { name: "Enseignement Supérieur", order: 5 },
];

export const schoolClasses = [
    // Maternelle
    { name: "Petite Section", cycle: "Maternelle" },
    { name: "Moyenne Section", cycle: "Maternelle" },
    { name: "Grande Section", cycle: "Maternelle" },
    // Primaire (selon le système ivoirien)
    { name: "CP1", cycle: "Enseignement Primaire" },
    { name: "CP2", cycle: "Enseignement Primaire" },
    { name: "CE1", cycle: "Enseignement Primaire" },
    { name: "CE2", cycle: "Enseignement Primaire" },
    { name: "CM1", cycle: "Enseignement Primaire" },
    { name: "CM2", cycle: "Enseignement Primaire" },
    // Secondaire - Premier cycle (Collège)
    { name: "6ème", cycle: "Enseignement Secondaire - Premier cycle" },
    { name: "5ème", cycle: "Enseignement Secondaire - Premier cycle" },
    { name: "4ème", cycle: "Enseignement Secondaire - Premier cycle" },
    { name: "3ème", cycle: "Enseignement Secondaire - Premier cycle" },
    // Secondaire - Deuxième cycle (Lycée)
    { name: "Seconde", cycle: "Enseignement Secondaire - Deuxième cycle" },
    { name: "Première", cycle: "Enseignement Secondaire - Deuxième cycle" },
    { name: "Terminale", cycle: "Enseignement Secondaire - Deuxième cycle" },
    // Supérieur
    { name: "BTS 1", cycle: "Enseignement Supérieur" },
    { name: "BTS 2", cycle: "Enseignement Supérieur" },
    { name: "Licence 1", cycle: "Enseignement Supérieur" },
    { name: "Licence 2", cycle: "Enseignement Supérieur" },
    { name: "Licence 3", cycle: "Enseignement Supérieur" },
];

export const higherEdFiliere = [
    "Ressources Humaines et Communication",
    "Finance Comptabilité et Gestion des Entreprises",
    "Logistique",
    "Informatique Développeur d'Application",
    "Marketing",
];
