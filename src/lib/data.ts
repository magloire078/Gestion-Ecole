
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

export type Grade = {
  id: string;
  studentId: string;
  subject: string;
  score: number;
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


export const mockClassData: Class[] = [
  { id: 'C1', name: 'Terminale A', studentCount: 25, mainTeacherId: 'T1', building: 'Bâtiment A', cycle: 'Lycée' },
  { id: 'C2', name: 'Terminale B', studentCount: 28, mainTeacherId: 'T2', building: 'Bâtiment A', cycle: 'Lycée' },
  { id: 'C3', name: 'Première S', studentCount: 30, mainTeacherId: 'T3', building: 'Bâtiment B', cycle: 'Lycée' },
  { id: 'C4', name: 'Seconde L', studentCount: 22, mainTeacherId: 'T4', building: 'Bâtiment C', cycle: 'Lycée' },
  { id: 'C5', name: 'Troisième', studentCount: 31, mainTeacherId: 'T5', building: 'Bâtiment C', cycle: 'Collège' },
  { id: 'C6', name: 'Quatrième', studentCount: 29, mainTeacherId: 'T6', building: 'Bâtiment C', cycle: 'Collège' },
  { id: 'C7', name: 'CM2', studentCount: 28, mainTeacherId: 'T8', building: 'Bâtiment D', cycle: 'Primaire' },
  { id: 'C8', name: 'CE1', studentCount: 26, mainTeacherId: 'T9', building: 'Bâtiment D', cycle: 'Primaire' },
  { id: 'C9', name: 'Grande Section', studentCount: 24, mainTeacherId: 'T10', building: 'Bâtiment E', cycle: 'Maternelle' },
  { id: 'C10', name: 'Ingénierie 1ère année', studentCount: 45, mainTeacherId: 'T7', building: 'Bâtiment F', cycle: 'Grandes Écoles' },
];

// La propriété 'class' est maintenant interprétée comme 'classe principale supervisée'.
export const mockTeacherData: Teacher[] = [
  { id: 'T1', name: 'Laurent Dubois', subject: 'Mathématiques', email: 'l.dubois@ecole.com', phone: '+221 77 123 45 67', class: 'Terminale A' },
  { id: 'T2', name: 'Sophie Martin', subject: 'Français', email: 's.martin@ecole.com', phone: '+221 77 234 56 78', class: 'Terminale B' },
  { id: 'T3', name: 'Paul Bernard', subject: 'Physique-Chimie', email: 'p.bernard@ecole.com', phone: '+221 77 345 67 89', class: 'Première S' },
  { id: 'T4', name: 'Hélène Petit', subject: 'Histoire-Géographie', email: 'h.petit@ecole.com', phone: '+221 77 456 78 90', class: 'Seconde L' },
  { id: 'T5', name: 'Anne-Marie Dupont', subject: 'Anglais', email: 'am.dupont@ecole.com', phone: '+221 77 567 89 01', class: 'Troisième' },
  { id: 'T6', name: 'Pierre Simon', subject: 'Philosophie', email: 'p.simon@ecole.com', phone: '+221 77 678 90 12' },
  { id: 'T7', name: 'Isabelle Lefevre', subject: 'SVT', email: 'i.lefevre@ecole.com', phone: '+221 77 789 01 23' },
  { id: 'T8', name: 'Nathalie Robert', subject: 'Polyvalent', email: 'n.robert@ecole.com', phone: '+221 77 890 12 34', class: 'CM2' },
  { id: 'T9', name: 'David Moreau', subject: 'Polyvalent', email: 'd.moreau@ecole.com', phone: '+221 77 111 22 33', class: 'CE1' },
  { id: 'T10', name: 'Émilie Girard', subject: 'Polyvalent', email: 'e.girard@ecole.com', phone: '+221 77 222 33 44', class: 'Grande Section' },
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
  { 
    id: 'S001', 
    matricule: '2023-001A',
    name: 'Alice Durand', 
    class: 'Terminale A', 
    dateOfBirth: '15/05/2006',
    placeOfBirth: 'Dakar',
    previousSchool: 'Lycée Français de Dakar',
    parent1Name: 'Jean Durand',
    parent1Contact: '+221 77 123 45 67',
    feedback: 'Le cours de mathématiques est difficile mais M. Dubois explique très bien.', 
    tuitionStatus: 'Soldé', 
    amountDue: 0 
  },
  { 
    id: 'S002', 
    matricule: '2023-002A',
    name: 'Bob Lemoine', 
    class: 'Terminale A', 
    dateOfBirth: '20/02/2006',
    placeOfBirth: 'Thiès',
    parent1Name: 'Marie Lemoine',
    parent1Contact: '+221 77 234 56 78',
    guardianName: 'Paul Lemoine',
    guardianContact: '+221 77 345 67 89',
    feedback: 'J\'aimerais plus d\'exercices pratiques en mathématiques pour mieux me préparer.', 
    tuitionStatus: 'En retard', 
    amountDue: 197000 
  },
  { 
    id: 'S003', 
    matricule: '2023-003B',
    name: 'Charlie Roux', 
    class: 'Terminale B', 
    dateOfBirth: '10/11/2005',
    placeOfBirth: 'Saint-Louis',
    parent1Name: 'Lucas Roux',
    parent1Contact: '+221 77 456 78 90',
    parent2Name: 'Awa Roux',
    parent2Contact: '+221 77 567 89 01',
    feedback: 'Mme. Martin est une excellente prof de français, ses cours sont passionnants.', 
    tuitionStatus: 'Soldé', 
    amountDue: 0 
  },
  { 
    id: 'S004', 
    matricule: '2023-004S',
    name: 'David Lefebvre', 
    class: 'Première S', 
    dateOfBirth: '30/07/2007',
    placeOfBirth: 'Kaolack',
    previousSchool: 'Collège Pie XII',
    parent1Name: 'Fatou Lefebvre',
    parent1Contact: '+221 77 678 90 12',
    feedback: 'Les expériences en chimie sont le meilleur moment de la semaine.', 
    tuitionStatus: 'Partiel', 
    amountDue: 50000 
  },
  { 
    id: 'S005', 
    matricule: '2023-005L',
    name: 'Eve Moreau', 
    class: 'Seconde L', 
    dateOfBirth: '05/09/2008',
    placeOfBirth: 'Dakar',
    parent1Name: 'Sophie Moreau',
    parent1Contact: '+221 77 789 01 23',
    feedback: 'Le cours d\'histoire est très intéressant, surtout la période contemporaine.', 
    tuitionStatus: 'Soldé', 
    amountDue: 0 
  },
  { 
    id: 'S006', 
    matricule: '2023-006P',
    name: 'Félix Guichard', 
    class: 'CM2', 
    dateOfBirth: '12/12/2012',
    placeOfBirth: 'Ziguinchor',
    parent1Name: 'Ousmane Guichard',
    parent1Contact: '+221 77 890 12 34',
    feedback: 'J\'aime beaucoup lire les livres de la bibliothèque.', 
    tuitionStatus: 'Soldé', 
    amountDue: 0 
  },
];

export const mockLibraryData: Book[] = [
  { id: 'L1', title: 'Les Misérables', author: 'Victor Hugo', quantity: 5 },
  { id: 'L2', title: 'L\'Étranger', author: 'Albert Camus', quantity: 3 },
  { id: 'L3', title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry', quantity: 10 },
  { id: 'L4', title: 'Voyage au bout de la nuit', author: 'Louis-Ferdinand Céline', quantity: 2 },
  { id: 'L5', title: 'Fables', author: 'Jean de La Fontaine', quantity: 8 },
];

export const mockFeeData: Fee[] = [
  { id: 'F1', grade: 'Maternelle', amount: '98 000 CFA', installments: '10 tranches mensuelles', details: 'Paiement avant le 5 de chaque mois. Inclus la cantine.' },
  { id: 'F2', grade: 'Primaire', amount: '131 000 CFA', installments: '10 tranches mensuelles', details: 'Paiement avant le 5 de chaque mois. Fournitures scolaires non incluses.' },
  { id: 'F3', grade: 'Collège', amount: '164 000 CFA', installments: '3 tranches trimestrielles', details: 'Paiement trimestriel possible. Inclus l\'accès à la bibliothèque.' },
  { id: 'F4', grade: 'Lycée', amount: '197 000 CFA', installments: '3 tranches trimestrielles', details: 'Paiement trimestriel possible. Frais d\'examen en sus.' },
];

export const mockStudentPerformanceData: Record<string, string> = {
  'Mathématiques': 'Les résultats des élèves en mathématiques montrent une nette amélioration ce semestre, avec une moyenne de classe en hausse de 15%. 80% des élèves ont obtenu une note supérieure à la moyenne. Les points faibles restent la géométrie dans l\'espace.',
  'Français': 'Excellente participation en classe et des résultats solides à l\'écrit. La moyenne de la classe est de 14/20. Quelques difficultés persistent en orthographe pour un petit groupe d\'élèves.',
  'Physique-Chimie': 'Très bon semestre avec des résultats remarquables en travaux pratiques. La moyenne générale est de 16/20. La section sur la thermodynamique a été particulièrement bien réussie par les élèves.',
  'Histoire-Géographie': 'Les élèves montrent un grand intérêt pour la matière. Les dissertations sont de bonne qualité, mais les connaissances sur les dates clés pourraient être améliorées. La moyenne de la classe est stable à 13/20.'
};

export const mockPerformanceData = [
    { subject: 'Maths', 'Ce Semestre': 14, 'Semestre Précédent': 12 },
    { subject: 'Français', 'Ce Semestre': 16, 'Semestre Précédent': 15 },
    { subject: 'Physique', 'Ce Semestre': 13, 'Semestre Précédent': 14 },
    { subject: 'Histoire', 'Ce Semestre': 15, 'Semestre Précédent': 13 },
    { subject: 'Anglais', 'Ce Semestre': 17, 'Semestre Précédent': 16 },
];

export const mockGradeData: Grade[] = [
    // Alice Durand - S001 - Terminale A
    { id: 'G01', studentId: 'S001', subject: 'Mathématiques', score: 15 },
    { id: 'G02', studentId: 'S001', subject: 'Français', score: 14 },
    { id: 'G03', studentId: 'S001', subject: 'Philosophie', score: 16 },
    { id: 'G04', studentId: 'S001', subject: 'Anglais', score: 17 },
    { id: 'G05', studentId: 'S001', subject: 'Histoire-Géographie', score: 13 },
    // Bob Lemoine - S002 - Terminale A
    { id: 'G06', studentId: 'S002', subject: 'Mathématiques', score: 11 },
    { id: 'G07', studentId: 'S002', subject: 'Français', score: 9 },
    { id: 'G08', studentId: 'S002', subject: 'Philosophie', score: 12 },
    { id: 'G09', studentId: 'S002', subject: 'Anglais', score: 13 },
    { id: 'G10', studentId: 'S002', subject: 'Histoire-Géographie', score: 10 },
    // Charlie Roux - S003 - Terminale B
    { id: 'G11', studentId: 'S003', subject: 'Mathématiques', score: 18 },
    { id: 'G12', studentId: 'S003', subject: 'Français', score: 17 },
    { id: 'G13', studentId: 'S003', subject: 'Philosophie', score: 15 },
    { id: 'G14', studentId: 'S003', subject: 'Anglais', score: 16 },
    // David Lefebvre - S004 - Première S
    { id: 'G15', studentId: 'S004', subject: 'Physique-Chimie', score: 17 },
    { id: 'G16', studentId: 'S004', subject: 'SVT', score: 15 },
    { id: 'G17', studentId: 'S004', subject: 'Mathématiques', score: 16 },
    // Eve Moreau - S005 - Seconde L
    { id: 'G18', studentId: 'S005', subject: 'Histoire-Géographie', score: 16 },
    { id: 'G19', studentId: 'S005', subject: 'Français', score: 15 },
    // Félix Guichard - S006 - CM2
    { id: 'G20', studentId: 'S006', subject: 'Français', score: 18 },
    { id: 'G21', studentId: 'S006', subject: 'Mathématiques', score: 16 },
    { id: 'G22', studentId: 'S006', subject: 'Histoire', score: 17 },
];

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

export const mockAccountingData: Transaction[] = [
    { id: 'TR1', date: '2023-09-05', description: 'Frais de scolarité - Alice Durand', category: 'Scolarité', type: 'Revenu', amount: 197000 },
    { id: 'TR2', date: '2023-09-05', description: 'Frais de scolarité - Charlie Roux', category: 'Scolarité', type: 'Revenu', amount: 197000 },
    { id: 'TR3', date: '2023-09-10', description: 'Achat de fournitures de bureau', category: 'Fournitures', type: 'Dépense', amount: 75000 },
    { id: 'TR4', date: '2023-09-15', description: 'Paiement partiel scolarité - David Lefebvre', category: 'Scolarité', type: 'Revenu', amount: 147000 },
    { id: 'TR5', date: '2023-09-20', description: 'Facture d\'électricité - Septembre', category: 'Services Publics', type: 'Dépense', amount: 120000 },
    { id: 'TR6', date: '2023-09-25', description: 'Salaires des enseignants', category: 'Salaires', type: 'Dépense', amount: 4500000 },
    { id: 'TR7', date: '2023-09-28', description: 'Don de l\'amicale des parents', category: 'Dons', type: 'Revenu', amount: 250000 },
];
    

    
