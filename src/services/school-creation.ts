
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp,
  setDoc
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

    try {
        await setDoc(schoolRef, schoolDocData);
        await setDirectorClaims(schoolData.directorId, schoolId);
        return { schoolId, schoolCode };

    } catch (e) {
        const permissionError = new FirestorePermissionError({
            path: schoolRef.path,
            operation: 'create',
            requestResourceData: { schoolName: schoolData.name, director: schoolData.directorId },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
    }
  }
}
