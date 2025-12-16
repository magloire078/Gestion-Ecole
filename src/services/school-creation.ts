
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { SCHOOL_TEMPLATES } from '@/lib/templates';
import type { school, user_root, staff, cycle, niveau, subject } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface SchoolCreationData {
    name: string;
    address: string;
    mainLogoUrl: string;
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
    const schoolDocData: Partial<school> = {
      name: schoolData.name,
      address: schoolData.address,
      phone: schoolData.phone,
      website: '', // Can be added later
      schoolCode: schoolCode,
      directorId: userId,
      directorFirstName: schoolData.directorFirstName,
      directorLastName: schoolData.directorLastName,
      directorPhone: '', // Can be added later
      createdAt: serverTimestamp() as unknown as string,
      mainLogoUrl: schoolData.mainLogoUrl,
      subscription: {
        plan: 'Essentiel',
        status: 'trialing',
        maxStudents: 50,
        maxCycles: 2,
      }
    };
    batch.set(schoolRef, schoolDocData);

    // 2. Add user to the /utilisateurs collection
    const userRef = doc(this.db, 'utilisateurs', userId);
    const userRootData: user_root = { schoolId };
    batch.set(userRef, userRootData);

    // 3. Create a staff profile for the director
    const staffRef = doc(this.db, `ecoles/${schoolId}/personnel`, userId);
    const directorProfileData: Omit<staff, 'id'> = {
        uid: userId,
        schoolId: schoolId,
        role: 'directeur',
        firstName: schoolData.directorFirstName,
        lastName: schoolData.directorLastName,
        displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
        email: schoolData.directorEmail,
        hireDate: new Date().toISOString(), // Use ISO string for server compatibility
        baseSalary: 0, // Default base salary
    };
    batch.set(staffRef, directorProfileData);

    // 4. Initialize school structure (Cycles and Niveaux)
    const template = SCHOOL_TEMPLATES.IVORIAN_SYSTEM;

    for (const cycle of template.cycles) {
        const cycleRef = doc(collection(this.db, `ecoles/${schoolId}/cycles`));
        const cycleData: Omit<cycle, 'id'> = { ...cycle, schoolId };
        batch.set(cycleRef, cycleData);
        
        const niveauxForCycle = template.niveaux[cycle.name as keyof typeof template.niveaux] || [];
        
        for (const [index, niveauName] of niveauxForCycle.entries()) {
            const niveauRef = doc(collection(this.db, `ecoles/${schoolId}/niveaux`));
            const niveauData: Omit<niveau, 'id'> = {
                name: niveauName,
                code: niveauName.replace(/\s+/g, '').toUpperCase(),
                cycleId: cycleRef.id,
                schoolId: schoolId,
                order: index + 1,
                ageMin: 5,
                ageMax: 6,
                capacity: 30,
            };
            batch.set(niveauRef, niveauData);
        }
    }
    
    // 5. Initialize default subjects
    for (const subject of template.subjects) {
      const subjectRef = doc(collection(this.db, `ecoles/${schoolId}/matieres`));
      const subjectData: Omit<subject, 'id'> = { ...subject, schoolId };
      batch.set(subjectRef, subjectData);
    }
    
    return batch.commit().then(() => {
        return { schoolId, schoolCode };
    }).catch(e => {
         const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}`,
            operation: 'create',
            requestResourceData: { schoolName: schoolData.name, director: userId },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e; // Rethrow original error after emitting our custom one
    });
  }
}
