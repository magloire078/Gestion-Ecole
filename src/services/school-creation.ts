
'use client';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp,
  setDoc,
  getDocs,
  query,
  where,
  limit
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { school, user_root, staff, admin_role, system_log } from '@/lib/data-types';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { getAuth } from 'firebase/auth';

// This would typically be a server-side function call.
// In this environment, we'll simulate the call and its effect.
// It's crucial for the useUser hook that this logic appears to run.
async function setDirectorClaims(userId: string, schoolId: string) {
    console.log(`[Simulating Claim] Setting isDirector=true and schoolId=${schoolId} for user ${userId}`);
    const auth = getAuth();
    if (auth.currentUser && auth.currentUser.uid === userId) {
        // Force refresh of the token on the client side.
        // This is the most critical part to break the onboarding loop.
        await auth.currentUser.getIdToken(true);
    }
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
    
    // Check if a school with this directorId already exists
    const q = query(collection(this.db, "ecoles"), where("directorId", "==", schoolData.directorId), limit(1));
    const existingSchoolSnap = await getDocs(q);
    if (!existingSchoolSnap.empty) {
        const existingSchool = existingSchoolSnap.docs[0].data();
        throw new Error(`Vous êtes déjà directeur/rice de l'école "${existingSchool.name}".`);
    }

    const schoolRef = doc(collection(this.db, 'ecoles'));
    const schoolId = schoolRef.id;
    const schoolCode = generateSchoolCode(schoolData.name);
    
    const userRootRef = doc(this.db, `utilisateurs/${schoolData.directorId}`);
    const staffProfileRef = doc(this.db, `ecoles/${schoolId}/personnel/${schoolData.directorId}`);
    const logRef = doc(collection(this.db, 'system_logs'));

    const batch = writeBatch(this.db);
    
    // 1. Create the main school document
    const schoolDocData: Omit<school, 'id'> = {
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

     // 2. Create the user root document
    const userRootData: user_root = { schoolId };
    batch.set(userRootRef, userRootData);

    // 3. Create director's staff profile
    const staffProfileData: Omit<staff, 'id'> = {
      uid: schoolData.directorId,
      email: schoolData.directorEmail,
      displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
      photoURL: '',
      schoolId: schoolId,
      role: 'directeur',
      firstName: schoolData.directorFirstName,
      lastName: schoolData.directorLastName,
      hireDate: new Date().toISOString().split('T')[0],
      baseSalary: 0,
    };
    batch.set(staffProfileRef, staffProfileData);
    
    // 4. Create system log
    batch.set(logRef, {
        adminId: schoolData.directorId,
        action: 'school.created',
        target: schoolRef.path,
        details: { schoolName: schoolData.name },
        ipAddress: 'N/A (client-side)',
        timestamp: serverTimestamp(),
    });


    try {
        await batch.commit();
        await setDirectorClaims(schoolData.directorId, schoolId);
        return { schoolId, schoolCode };
    } catch (e) {
        const permissionError = new FirestorePermissionError({
            path: `[BATCH WRITE] /ecoles/${schoolId}`,
            operation: 'create',
            requestResourceData: { schoolName: schoolData.name, director: schoolData.directorId },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
    }
  }
}
