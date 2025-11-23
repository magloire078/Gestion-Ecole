

export type Teacher = {
  id: string;
  name: string;
  classId?: string; // ID of the main class
  class?: string; // Name of the main class (denormalized for display)
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

// --- Données standardisées pour le système éducatif Ivoirien ---

export const schoolCycles = [
    { name: "Maternelle", order: 1 },
    { name: "Primaire", order: 2 },
    { name: "Secondaire", order: 3 }, // Regroupe collège et lycée
];

export const schoolClasses = [
    // Maternelle
    { name: "Petite Section", cycle: "Maternelle" },
    { name: "Moyenne Section", cycle: "Maternelle" },
    { name: "Grande Section", cycle: "Maternelle" },
    // Primaire
    { name: "CP1", cycle: "Primaire" },
    { name: "CP2", cycle: "Primaire" },
    { name: "CE1", cycle: "Primaire" },
    { name: "CE2", cycle: "Primaire" },
    { name: "CM1", cycle: "Primaire" },
    { name: "CM2", cycle: "Primaire" },
    // Secondaire
    { name: "6ème", cycle: "Secondaire" },
    { name: "5ème", cycle: "Secondaire" },
    { name: "4ème", cycle: "Secondaire" },
    { name: "3ème", cycle: "Secondaire" },
    { name: "Seconde", cycle: "Secondaire" },
    { name: "Première", cycle: "Secondaire" },
    { name: "Terminale", cycle: "Secondaire" },
];

    