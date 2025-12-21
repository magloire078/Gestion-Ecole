
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
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    console.log("=== VÉRIFICATION PRÉ-CRÉATION ===");
    console.log("1. Utilisateur authentifié:", !!auth.currentUser);
    console.log("2. UID utilisateur:", auth.currentUser?.uid);
    console.log("3. UID directeur:", schoolData.directorId);
    console.log("4. Correspondance:", auth.currentUser?.uid === schoolData.directorId);

    if (!currentUser) {
      throw new Error("❌ Vous devez être connecté pour créer une école");
    }

    if (currentUser.uid !== schoolData.directorId) {
      throw new Error("❌ Vous devez être le directeur de l'école que vous créez");
    }
    
    // Vérifier l'existence d'une école
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

    // 1. Document école
    const schoolDocData = {
      name: schoolData.name,
      address: schoolData.address,
      phone: schoolData.phone,
      email: schoolData.email,
      schoolCode: schoolCode,
      directorId: schoolData.directorId,
      directorFirstName: schoolData.directorFirstName,
      directorLastName: schoolData.directorLastName,
      createdAt: serverTimestamp(),
      mainLogoUrl: schoolData.mainLogoUrl,
      subscription: {
        plan: 'Essentiel',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        maxStudents: 50,
        maxCycles: 2,
        activeModules: [],
      },
      status: 'active',
    };

    // 2. Document utilisateur
    const userRootData = { 
      schoolId: schoolId,
      updatedAt: serverTimestamp()
    };

    // 3. Profil personnel
    const staffProfileData = {
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
      status: 'Actif',
      createdAt: serverTimestamp(),
    };

    // 4. Log système
    const logData = {
        adminId: schoolData.directorId,
        action: 'school.created',
        target: schoolRef.path,
        details: { 
          schoolName: schoolData.name,
          schoolId: schoolId,
          director: `${schoolData.directorFirstName} ${schoolData.directorLastName}`
        },
        ipAddress: 'N/A (client-side)',
        userAgent: 'N/A (client-side)',
        timestamp: serverTimestamp(),
    };
    
    try {
        console.log("Tentative de création avec writeBatch...");
        const batch = writeBatch(this.db);

        batch.set(schoolRef, schoolDocData as any);
        batch.set(userRootRef, userRootData as any, { merge: true });
        batch.set(staffProfileRef, staffProfileData as any);
        batch.set(logRef, logData as any);

        await batch.commit();
        
        console.log("✅ Batch commit réussi!");
        
        console.log("Rafraîchissement du token...");
        await currentUser.getIdToken(true);
        console.log("✅ Token rafraîchi");

        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { 
          schoolId, 
          schoolCode
        };
        
    } catch (error: any) {
        console.error("❌ Erreur détaillée du batch:", error);
        
        if (currentUser) {
            try {
                const token = await currentUser.getIdTokenResult();
                console.log("Claims au moment de l'erreur:", token.claims);
            } catch (tokenError) {
                console.error("Erreur de token:", tokenError);
            }
        }
        
        throw error;
    }
  }
}
