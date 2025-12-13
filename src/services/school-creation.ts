
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp
} from 'firebase/firestore';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import type { Firestore } from 'firebase/firestore';
import { format as formatDateFns } from 'date-fns';

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
    const templateId = 'FRENCH_PRIMARY' as keyof typeof SCHOOL_TEMPLATES;
    const template = SCHOOL_TEMPLATES[templateId];

    const schoolId = doc(collection(this.db, 'id_generator')).id;
    const schoolCode = generateSchoolCode(schoolData.name);
    
    const batch = writeBatch(this.db);

    // 1. Create the main school document
    const schoolRef = doc(this.db, 'ecoles', schoolId);
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
        hireDate: formatDateFns(new Date(), 'yyyy-MM-dd'),
        baseSalary: 0, // Default base salary
    });
    
    // This step is incorrect as cycles are not school-specific
    // 4. Create default structure from template
    // template.cycles.forEach(cycle => {
    //     const cycleRef = doc(collection(this.db, `ecoles/${schoolId}/cycles`));
    //     batch.set(cycleRef, { ...cycle, schoolId });
    // });

    await batch.commit();
    
    return { schoolId, schoolCode };
  }
}

    