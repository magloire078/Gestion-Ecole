

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
    { name: "Enseignement Préscolaire", order: 1 },
    { name: "Enseignement Primaire", order: 2 },
    { name: "Enseignement Secondaire - Premier Cycle", order: 3 },
    { name: "Enseignement Secondaire - Deuxième Cycle", order: 4 },
    { name: "Enseignement Technique et Professionnel", order: 5 },
];

export const schoolClasses = [
    // Maternelle
    { name: "Petite Section", cycle: "Enseignement Préscolaire" },
    { name: "Moyenne Section", cycle: "Enseignement Préscolaire" },
    { name: "Grande Section", cycle: "Enseignement Préscolaire" },
    // Primaire
    { name: "CP1", cycle: "Enseignement Primaire" },
    { name: "CP2", cycle: "Enseignement Primaire" },
    { name: "CE1", cycle: "Enseignement Primaire" },
    { name: "CE2", cycle: "Enseignement Primaire" },
    { name: "CM1", cycle: "Enseignement Primaire" },
    { name: "CM2", cycle: "Enseignement Primaire" },
    // Secondaire - Premier cycle (Collège)
    { name: "6ème", cycle: "Enseignement Secondaire - Premier Cycle" },
    { name: "5ème", cycle: "Enseignement Secondaire - Premier Cycle" },
    { name: "4ème", cycle: "Enseignement Secondaire - Premier Cycle" },
    { name: "3ème", cycle: "Enseignement Secondaire - Premier Cycle" },
    // Secondaire - Deuxième cycle (Lycée)
    { name: "Seconde", cycle: "Enseignement Secondaire - Deuxième Cycle" },
    { name: "Première", cycle: "Enseignement Secondaire - Deuxième Cycle" },
    { name: "Terminale", cycle: "Enseignement Secondaire - Deuxième Cycle" },
    // Technique
    { name: "CAP 1", cycle: "Enseignement Technique et Professionnel" },
    { name: "BT 1", cycle: "Enseignement Technique et Professionnel" },
    { name: "BTS 1", cycle: "Enseignement Technique et Professionnel" },
];
