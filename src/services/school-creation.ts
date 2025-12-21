
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

    console.log("Current User UID:", currentUser.uid);
    console.log("Director ID from data:", schoolData.directorId);
    
    if (currentUser.uid !== schoolData.directorId) {
      throw new Error("Vous devez être le directeur de l'école que vous créez");
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
    
    console.log("School ID généré:", schoolId);
    console.log("School Code:", schoolCode);
    
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
    
    console.log("Données école:", schoolDocData);

    // 2. Document utilisateur
    const userRootData = { 
      schoolId: schoolId,
      updatedAt: serverTimestamp()
    };
    
    console.log("Données utilisateur:", userRootData);

    // 3. Profil personnel - CRITIQUE: utiliser 'uid' (minuscule)
    const staffProfileData = {
      uid: schoolData.directorId, // 'uid' en minuscule pour correspondre aux règles
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
    
    console.log("Données personnel:", staffProfileData);

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
    
    console.log("Données log:", logData);

    try {
        console.log("Tentative de création séparée...");
        
        // TEST: Créer chaque document séparément pour identifier l'erreur
        console.log("1. Création école...");
        await setDoc(schoolRef, schoolDocData as any);
        console.log("✅ École créée");
        
        console.log("2. Mise à jour utilisateur...");
        await setDoc(userRootRef, userRootData as any, { merge: true });
        console.log("✅ Utilisateur mis à jour");
        
        console.log("3. Création profil personnel...");
        await setDoc(staffProfileRef, staffProfileData as any);
        console.log("✅ Profil personnel créé");
        
        console.log("4. Création log...");
        await setDoc(logRef, logData as any);
        console.log("✅ Log créé");
        
        // Rafraîchir le token
        console.log("Rafraîchissement du token...");
        await currentUser.getIdToken(true);
        
        // Attendre la propagation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log("✅ École créée avec succès!");
        
        return { 
          schoolId, 
          schoolCode
        };
        
    } catch (error: any) {
        console.error("❌ Erreur détaillée:", {
            code: error.code,
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        // Vérifier le token actuel
        if (currentUser) {
            try {
                const token = await currentUser.getIdTokenResult();
                console.log("Claims actuels:", token.claims);
            } catch (tokenError) {
                console.error("Erreur token:", tokenError);
            }
        }
        
        throw error;
    }
  }
}
