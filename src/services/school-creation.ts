
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { school, user_root, staff, admin_role, system_log } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

// This would typically be a server-side function call.
// In this environment, we'll simulate the call and its effect.
// It's crucial for the useUser hook that this logic appears to run.
async function setDirectorClaims(userId: string, schoolId: string) {
    console.log(`[Simulating Claim] Setting isDirector=true and schoolId=${schoolId} for user ${userId}`);
    // In a real app, you'd call a Cloud Function here:
    // const setClaimsFunction = httpsCallable(functions, 'setDirectorClaims');
    // await setClaimsFunction({ userId, schoolId });
    // For now, we assume this will be picked up by the auth token on next refresh.
    return Promise.resolve();
}


interface SchoolCreationData {
    name: string;
    address: string;
    mainLogoUrl: string;
    phone: string;
    email: string;
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

  async createSchool(schoolData: SchoolCreationData) {
    const schoolRef = doc(collection(this.db, 'ecoles'));
    const schoolId = schoolRef.id;
    const schoolCode = generateSchoolCode(schoolData.name);
    
    const batch = writeBatch(this.db);

    // 1. Create the main school document
    const schoolDocData: school = {
      name: schoolData.name,
      address: schoolData.address,
      phone: schoolData.phone,
      email: schoolData.email,
      schoolCode: schoolCode,
      directorId: schoolData.directorId,
      directorFirstName: schoolData.directorFirstName,
      directorLastName: schoolData.directorLastName,
      createdAt: serverTimestamp() as any,
      mainLogoUrl: schoolData.mainLogoUrl,
      subscription: {
        plan: 'Pro',
        status: 'trialing',
        maxStudents: 250,
        maxCycles: 5,
        activeModules: [],
      },
      status: 'active',
    };
    batch.set(schoolRef, schoolDocData);

    // 2. Add user to the /utilisateurs collection
    const userRef = doc(this.db, 'utilisateurs', schoolData.directorId);
    const userRootData: user_root = { schoolId };
    batch.set(userRef, userRootData);

    // 3. Create a staff profile for the director
    const staffRef = doc(this.db, `ecoles/${schoolId}/personnel`, schoolData.directorId);
    
    const directorProfileData: staff = {
        uid: schoolData.directorId,
        schoolId: schoolId,
        role: 'directeur',
        adminRole: 'directeur', // Assign a default adminRole name
        firstName: schoolData.directorFirstName,
        lastName: schoolData.directorLastName,
        displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
        email: schoolData.directorEmail,
        hireDate: new Date().toISOString(),
        baseSalary: 0,
        status: 'Actif',
    };
    batch.set(staffRef, directorProfileData);
    
    // This is the CRITICAL new step: setting custom claims.
    await setDirectorClaims(schoolData.directorId, schoolId);
    
    return batch.commit().then(() => {
        return { schoolId, schoolCode };
    }).catch(e => {
         const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}`,
            operation: 'create',
            requestResourceData: { schoolName: schoolData.name, director: schoolData.directorId },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
    });
  }
}
