
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { SCHOOL_TEMPLATES } from '@/lib/templates';

interface SchoolCreationData {
    name: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    academicYear: string;
    language: string;
    currency: string;
    directorId: string;
    directorFirstName: string;
    directorLastName: string;
    directorEmail: string;
}

const generateSchoolCode = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNumber}`;
};

export class SchoolCreationService {
  private db: Firestore;

  constructor(firestore: Firestore) {
    this.db = firestore;
  }

  async createSchool(schoolData: SchoolCreationData, userId: string) {
    const schoolRef = doc(collection(this.db, 'ecoles'));
    const schoolId = schoolRef.id;
    const schoolCode = generateSchoolCode(schoolData.name);
    
    const batch = writeBatch(this.db);

    // 1. Create the main school document
    batch.set(schoolRef, {
      name: schoolData.name,
      address: `${schoolData.address}, ${schoolData.city}, ${schoolData.country}`,
      phone: schoolData.phone,
      website: '', // Can be added later
      schoolCode: schoolCode,
      directorId: userId,
      directorFirstName: schoolData.directorFirstName,
      directorLastName: schoolData.directorLastName,
      directorPhone: '', // Can be added later
      createdAt: serverTimestamp(),
      subscription: {
        plan: 'Essentiel', // Start with a basic plan
        status: 'trialing',
      }
    });

    // 2. Add user to the /utilisateurs collection
    const userRef = doc(this.db, 'utilisateurs', userId);
    batch.set(userRef, { schoolId });

    // 3. Create a staff profile for the director
    const staffRef = doc(this.db, `ecoles/${schoolId}/personnel`, userId);
    batch.set(staffRef, {
        uid: userId,
        schoolId: schoolId,
        role: 'directeur',
        firstName: schoolData.directorFirstName,
        lastName: schoolData.directorLastName,
        displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
        email: schoolData.directorEmail,
        hireDate: new Date().toISOString(), // Use ISO string for server compatibility
        baseSalary: 0, // Default base salary
    });

    // 4. Initialize school structure (Cycles and Niveaux)
    const template = SCHOOL_TEMPLATES.FRENCH_PRIMARY;
    
    for (const cycle of template.cycles) {
        const cycleRef = doc(collection(this.db, `ecoles/${schoolId}/cycles`));
        batch.set(cycleRef, { ...cycle, schoolId });
        
        const NIVEAUX = {
          "Maternelle": ["Petite Section", "Moyenne Section", "Grande Section"],
          "Enseignement Primaire": ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"],
          "Enseignement Secondaire - Premier cycle": ["6ème", "5ème", "4ème", "3ème"],
          "Enseignement Secondaire - Deuxième cycle": ["Seconde", "Première", "Terminale"]
        };
        
        const niveauxForCycle = NIVEAUX[cycle.name as keyof typeof NIVEAUX] || [];
        
        for (const niveauName of niveauxForCycle) {
            const niveauRef = doc(collection(this.db, `ecoles/${schoolId}/niveaux`));
            batch.set(niveauRef, {
                name: niveauName,
                code: niveauName.replace(/\s+/g, '').toUpperCase(),
                cycleId: cycleRef.id,
                schoolId: schoolId,
                order: niveauxForCycle.indexOf(niveauName) + 1,
                // Default values that can be edited later
                ageMin: 5,
                ageMax: 6,
                capacity: 30,
            });
        }
    }
    
    // 5. Initialize default subjects
    for (const subject of template.subjects) {
      const subjectRef = doc(collection(this.db, `ecoles/${schoolId}/matieres`));
      batch.set(subjectRef, { ...subject, schoolId });
    }

    await batch.commit();
    
    return { schoolId, schoolCode };
  }
}
