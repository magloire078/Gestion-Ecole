
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
    console.log("=== DÉBUT CRÉATION ÉCOLE ===");
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error("Utilisateur non authentifié");
    }
    
    console.log("User UID:", currentUser.uid);
    console.log("Director ID from data:", schoolData.directorId);

    if (currentUser.uid !== schoolData.directorId) {
      throw new Error("Vous devez être le directeur de l'école que vous créez");
    }
    
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
        plan: 'Essentiel',
        status: 'active',
        maxStudents: 50,
        maxCycles: 2,
        activeModules: [],
      },
      status: 'active',
    };
    
    console.log("Création école:", { path: schoolRef.path, data: schoolDocData });
    batch.set(schoolRef, schoolDocData);

    // 2. Create or Update the user root document to link them to the school
    const userRootData: user_root = { 
      schoolId: schoolId,
    };
    
    console.log("Mise à jour utilisateur:", { path: userRootRef.path, data: userRootData });
    batch.set(userRootRef, userRootData, { merge: true });

    // 3. Create director's staff profile
    const staffProfileData: Partial<staff> = {
      uid: schoolData.directorId,
      email: schoolData.directorEmail,
      displayName: `${schoolData.directorFirstName} ${schoolData.directorLastName}`,
      photoURL: '',
      schoolId: schoolId,
      role: 'directeur', // This is crucial for the new security rule
      firstName: schoolData.directorFirstName,
      lastName: schoolData.directorLastName,
      hireDate: new Date().toISOString().split('T')[0],
      baseSalary: 0,
      status: 'Actif',
    };
    
    console.log("Création profil personnel:", { path: staffProfileRef.path, data: staffProfileData });
    batch.set(staffProfileRef, staffProfileData);
    
    // 4. Create system log
    const logData: Omit<system_log, 'id'> = {
        adminId: schoolData.directorId,
        action: 'school.created',
        target: schoolRef.path,
        details: { 
          schoolName: schoolData.name,
          schoolId: schoolId,
        },
        ipAddress: 'N/A (client-side)',
        userAgent: 'N/A (client-side)',
        timestamp: serverTimestamp() as any,
    };
    
    console.log("Création log:", { path: logRef.path, data: logData });
    batch.set(logRef, logData);

    try {
        console.log("Commit du batch...");
        await batch.commit();
        console.log("✅ Batch commit réussi!");
        
        // This is a client-side simulation of a server-side claim setting
        await setDirectorClaims(schoolData.directorId, schoolId);
        
        // Wait a bit for propagation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { 
          schoolId, 
          schoolCode
        };
        
    } catch (error: any) {
        console.error("❌ Erreur lors de la création:", error);
        
        if (error.code === 'permission-denied') {
            console.error("DÉTAILS ERREUR PERMISSION:", error.message);
        }
        
        throw new Error(`La création de l'école a échoué: ${error.message}`);
    }
  }
}
