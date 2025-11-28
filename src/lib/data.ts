
export type Teacher = {
  id: string;
  name: string;
  classId?: string; // ID of the main class
  subject: string;
  email: string;
  phone?: string;
};

export type TimetableEntry = {
  id: string;
  classId: string;
  teacherId: string;
  subject: string;
};

export type Student = {
  id: string;
  matricule?: string;
  name: string;
  class: string;
  classId: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  previousSchool?: string;
  parent1Name?: string;
  parent1Contact?: string;
  parent2Name?: string;
  parent2Contact?: string;
  guardianName?: string;
  guardianContact?: string;
  feedback: string;
  tuitionStatus: 'Soldé' | 'En retard' | 'Partiel';
  amountDue: number;
  grades?: Record<string, number>;
};

export type Class = {
  id: string;
  name: string;
  studentCount: number;
  mainTeacherId: string;
  building: string;
  cycle: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  quantity: number;
};

export type Fee = {
  id: string;
  grade: string;
  amount: string;
  installments: string;
  details: string;
};

export type Transaction = {
    id: string;
    date: string;
    description: string;
    category: string;
    type: 'Revenu' | 'Dépense';
    amount: number;
};

export interface AccountingTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'Revenu' | 'Dépense';
  amount: number;
}

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
];

    
