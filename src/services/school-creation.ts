
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp
} from 'firebase/firestore';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import type { Firestore } from 'firebase/firestore';

interface SchoolData {
    name: string;
    type: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    academicYear: string;
    language: string;
    currency: string;
    template: string;
    directorId: string;
    directorName: string;
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

  async createSchool(schoolData: SchoolData, userId: string) {
    const templateId = (schoolData.template === 'international' ? 'INTERNATIONAL_SCHOOL' : 'FRENCH_PRIMARY') as keyof typeof SCHOOL_TEMPLATES;
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
      directorFirstName: schoolData.directorName.split(' ')[0],
      directorLastName: schoolData.directorName.split(' ').slice(1).join(' '),
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
        firstName: schoolData.directorName.split(' ')[0],
        lastName: schoolData.directorName.split(' ').slice(1).join(' '),
        email: schoolData.directorEmail,
        hireDate: format(new Date(), 'yyyy-MM-dd'),
    });
    
    // 4. Create default structure from template
    template.cycles.forEach(cycle => {
        const cycleRef = doc(collection(this.db, `ecoles/${schoolId}/cycles`));
        batch.set(cycleRef, { ...cycle, schoolId });
    });

    await batch.commit();
    
    return { schoolId, schoolCode };
  }
}

// Helper to format date
const format = (date: Date, formatStr: string) => {
    // Basic formatter, replace with date-fns if available
    if (formatStr === 'yyyy-MM-dd') {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return date.toISOString();
}
