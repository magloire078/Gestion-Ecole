

export type Teacher = {
  id: string;
  name: string;
  class?: string; // class is now optional as a teacher can teach multiple classes
  subject: string;
  email: string;
};

export type TimetableEntry = {
  id: string;
  classId: string;
  teacherId: string;
  subject: string;
};

export type Student = {
  id: string;
  name: string;
  class: string;
  feedback: string;
  tuitionStatus: 'Payé' | 'En retard' | 'Partiel';
  amountDue: number;
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


export const mockClassData: Class[] = [
  { id: 'C1', name: 'Terminale A', studentCount: 25, mainTeacherId: 'T1', building: 'Bâtiment A', cycle: 'Lycée' },
  { id: 'C2', name: 'Terminale B', studentCount: 28, mainTeacherId: 'T2', building: 'Bâtiment A', cycle: 'Lycée' },
  { id: 'C3', name: 'Première S', studentCount: 30, mainTeacherId: 'T3', building: 'Bâtiment B', cycle: 'Lycée' },
  { id: 'C4', name: 'Seconde L', studentCount: 22, mainTeacherId: 'T4', building: 'Bâtiment C', cycle: 'Lycée' },
  { id: 'C5', name: 'Troisième', studentCount: 31, mainTeacherId: 'T5', building: 'Bâtiment C', cycle: 'Collège' },
  { id: 'C6', name: 'Quatrième', studentCount: 29, mainTeacherId: 'T6', building: 'Bâtiment C', cycle: 'Collège' },
];

// Teachers now have subjects, but are not tied to a single class.
// The 'class' property can be re-interpreted as 'main class supervised'.
export const mockTeacherData: Teacher[] = [
  { id: 'T1', name: 'Laurent Dubois', subject: 'Mathématiques', email: 'l.dubois@ecole.com', class: 'Terminale A' },
  { id: 'T2', name: 'Sophie Martin', subject: 'Français', email: 's.martin@ecole.com', class: 'Terminale B' },
  { id: 'T3', name: 'Paul Bernard', subject: 'Physique-Chimie', email: 'p.bernard@ecole.com', class: 'Première S' },
  { id: 'T4', name: 'Hélène Petit', subject: 'Histoire-Géographie', email: 'h.petit@ecole.com', class: 'Seconde L' },
  { id: 'T5', name: 'Anne-Marie Dupont', subject: 'Anglais', email: 'am.dupont@ecole.com', class: 'Troisième' },
  { id: 'T6', name: 'Pierre Simon', subject: 'Philosophie', email: 'p.simon@ecole.com' },
  { id: 'T7', name: 'Isabelle Lefevre', subject: 'SVT', email: 'i.lefevre@ecole.com' },
];

export const mockTimetableData: TimetableEntry[] = [
    { id: 'TT1', classId: 'C1', teacherId: 'T1', subject: 'Mathématiques' },
    { id: 'TT2', classId: 'C1', teacherId: 'T2', subject: 'Français' },
    { id: 'TT3', classId: 'C1', teacherId: 'T6', subject: 'Philosophie' },
    { id: 'TT4', classId: 'C1', teacherId: 'T5', subject: 'Anglais' },
    { id: 'TT5', classId: 'C2', teacherId: 'T2', subject: 'Français' },
    { id: 'TT6', classId: 'C2', teacherId: 'T1', subject: 'Mathématiques' },
    { id: 'TT7', classId: 'C2', teacherId: 'T5', subject: 'Anglais' },
    { id: 'TT8', classId: 'C3', teacherId: 'T3', subject: 'Physique-Chimie' },
    { id: 'TT9', classId: 'C3', teacherId: 'T7', subject: 'SVT' },
    { id: 'TT10', classId: 'C3', teacherId: 'T1', subject: 'Mathématiques' },
    { id: 'TT11', classId: 'C4', teacherId: 'T4', subject: 'Histoire-Géographie' },
    { id: 'TT12', classId: 'C4', teacherId: 'T2', subject: 'Français' },
    { id: 'TT13', classId: 'C5', teacherId: 'T5', subject: 'Anglais' },
    { id: 'TT14', classId: 'C6', teacherId: 'T2', subject: 'Français' },
];

export const mockStudentData: Student[] = [
  { id: 'S001', name: 'Alice Durand', class: 'Terminale A', feedback: 'Le cours de mathématiques est difficile mais M. Dubois explique très bien.', tuitionStatus: 'Payé', amountDue: 0 },
  { id: 'S002', name: 'Bob Lemoine', class: 'Terminale A', feedback: 'J\'aimerais plus d\'exercices pratiques en mathématiques pour mieux me préparer.', tuitionStatus: 'En retard', amountDue: 197000 },
  { id: 'S003', name: 'Charlie Roux', class: 'Terminale B', feedback: 'Mme. Martin est une excellente prof de français, ses cours sont passionnants.', tuitionStatus: 'Payé', amountDue: 0 },
  { id: 'S004', name: 'David Lefebvre', class: 'Première S', feedback: 'Les expériences en chimie sont le meilleur moment de la semaine.', tuitionStatus: 'Partiel', amountDue: 50000 },
  { id: 'S005', name: 'Eve Moreau', class: 'Seconde L', feedback: 'Le cours d\'histoire est très intéressant, surtout la période contemporaine.', tuitionStatus: 'Payé', amountDue: 0 },
];

export const mockLibraryData: Book[] = [
  { id: 'L1', title: 'Les Misérables', author: 'Victor Hugo', quantity: 5 },
  { id: 'L2', title: 'L\'Étranger', author: 'Albert Camus', quantity: 3 },
  { id: 'L3', title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry', quantity: 10 },
  { id: 'L4', title: 'Voyage au bout de la nuit', author: 'Louis-Ferdinand Céline', quantity: 2 },
  { id: 'L5', title: 'Fables', author: 'Jean de La Fontaine', quantity: 8 },
];

export const mockFeeData = [
  { id: 'F1', grade: 'Maternelle', amount: '98 000 CFA / mois', details: 'Paiement avant le 5 de chaque mois. Inclus la cantine.' },
  { id: 'F2', grade: 'Primaire', amount: '131 000 CFA / mois', details: 'Paiement avant le 5 de chaque mois. Fournitures scolaires non incluses.' },
  { id: 'F3', grade: 'Collège', amount: '164 000 CFA / mois', details: 'Paiement trimestriel possible. Inclus l\'accès à la bibliothèque.' },
  { id: 'F4', grade: 'Lycée', amount: '197 000 CFA / mois', details: 'Paiement trimestriel possible. Frais d\'examen en sus.' },
];

export const mockStudentPerformanceData: Record<string, string> = {
  'Mathématiques': 'Les résultats des élèves en mathématiques montrent une nette amélioration ce semestre, avec une moyenne de classe en hausse de 15%. 80% des élèves ont obtenu une note supérieure à la moyenne. Les points faibles restent la géométrie dans l\'espace.',
  'Français': 'Excellente participation en classe et des résultats solides à l\'écrit. La moyenne de la classe est de 14/20. Quelques difficultés persistent en orthographe pour un petit groupe d\'élèves.',
  'Physique-Chimie': 'Très bon semestre avec des résultats remarquables en travaux pratiques. La moyenne générale est de 16/20. La section sur la thermodynamique a été particulièrement bien réussie par les élèves.',
  'Histoire-Géographie': 'Les élèves montrent un grand intérêt pour la matière. Les dissertations sont de bonne qualité, mais les connaissances sur les dates clés pourraient être améliorées. La moyenne de la classe est stable à 13/20.'
};

export const mockPerformanceData = [
    { subject: 'Maths', 'Ce Semestre': 82, 'Semestre Précédent': 75 },
    { subject: 'Français', 'Ce Semestre': 91, 'Semestre Précédent': 88 },
    { subject: 'Physique', 'Ce Semestre': 78, 'Semestre Précédent': 81 },
    { subject: 'Histoire', 'Ce Semestre': 85, 'Semestre Précédent': 80 },
    { subject: 'Anglais', 'Ce Semestre': 95, 'Semestre Précédent': 92 },
];
