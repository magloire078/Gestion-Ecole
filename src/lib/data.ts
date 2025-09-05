export type Teacher = {
  id: string;
  name: string;
  class: string;
  subject: string;
  email: string;
};

export const mockClassData = [
  { id: 'C1', name: 'Terminale A', teacher: 'M. Dubois', studentCount: 25 },
  { id: 'C2', name: 'Terminale B', teacher: 'Mme. Martin', studentCount: 28 },
  { id: 'C3', name: 'Première S', teacher: 'M. Bernard', studentCount: 30 },
  { id: 'C4', name: 'Seconde L', teacher: 'Mme. Petit', studentCount: 22 },
];

export const mockTeacherData: Teacher[] = [
  { id: 'T1', name: 'Laurent Dubois', class: 'Terminale A', subject: 'Mathématiques', email: 'l.dubois@ecole.com' },
  { id: 'T2', name: 'Sophie Martin', class: 'Terminale B', subject: 'Français', email: 's.martin@ecole.com' },
  { id: 'T3', name: 'Paul Bernard', class: 'Première S', subject: 'Physique-Chimie', email: 'p.bernard@ecole.com' },
  { id: 'T4', name: 'Hélène Petit', class: 'Seconde L', subject: 'Histoire-Géographie', email: 'h.petit@ecole.com' },
];

export const mockStudentData = [
  { id: 'S001', name: 'Alice Durand', class: 'Terminale A', feedback: 'Le cours de mathématiques est difficile mais M. Dubois explique très bien.' },
  { id: 'S002', name: 'Bob Lemoine', class: 'Terminale A', feedback: 'J\'aimerais plus d\'exercices pratiques en mathématiques pour mieux me préparer.' },
  { id: 'S003', name: 'Charlie Roux', class: 'Terminale B', feedback: 'Mme. Martin est une excellente prof de français, ses cours sont passionnants.' },
  { id: 'S004', name: 'David Lefebvre', class: 'Première S', feedback: 'Les expériences en chimie sont le meilleur moment de la semaine.' },
  { id: 'S005', name: 'Eve Moreau', class: 'Seconde L', feedback: 'Le cours d\'histoire est très intéressant, surtout la période contemporaine.' },
];

export const mockLibraryData = [
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
