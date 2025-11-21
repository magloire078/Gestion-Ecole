

export type Teacher = {
  id: string;
  name: string;
  class?: string; // class est optionnel car un enseignant peut enseigner à plusieurs classes
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

// --- Mock Data Section - Kept for reference or quick testing ---

export const mockPerformanceData = [
    { subject: 'Maths', 'Ce Semestre': 14, 'Semestre Précédent': 12 },
    { subject: 'Français', 'Ce Semestre': 16, 'Semestre Précédent': 15 },
    { subject: 'Physique', 'Ce Semestre': 13, 'Semestre Précédent': 14 },
    { subject: 'Histoire', 'Ce Semestre': 15, 'Semestre Précédent': 13 },
    { subject: 'Anglais', 'Ce Semestre': 17, 'Semestre Précédent': 16 },
];

